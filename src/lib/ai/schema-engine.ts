import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

// ── Schema Zod del Scene Graph ────────────────────────────────────────────────

const PaletteSchema = z.object({
  background: z.string().describe('Hex color for canvas background'),
  node_primary: z.string().describe('Hex color for primary/root nodes'),
  node_secondary: z.string().describe('Hex color for secondary nodes'),
  node_leaf: z.string().describe('Hex color for leaf/detail nodes'),
  edge: z.string().describe('Hex color for connection lines'),
  text_on_dark: z.string().describe('Hex color for text on dark nodes'),
  text_on_light: z.string().describe('Hex color for text on light nodes'),
  accent: z.string().describe('Hex color for highlights and annotations'),
  group_bg: z.string().describe('Semi-transparent hex for group backgrounds'),
})

const NodeSchema = z.object({
  id: z.string().describe('Unique identifier, snake_case'),
  label: z.string().describe('Main visible label, concise (max 3 words)'),
  sublabel: z.string().optional().describe('Optional subtitle or short description'),
  type: z.enum(['root', 'primary', 'secondary', 'leaf', 'annotation']),
  x: z.number().min(0.02).max(0.98).describe('Normalized X position 0-1 (left to right)'),
  y: z.number().min(0.02).max(0.98).describe('Normalized Y position 0-1 (top to bottom)'),
  size: z.enum(['large', 'medium', 'small']).describe('large=root/central, medium=primary, small=detail'),
  shape: z.enum(['rect', 'rounded', 'circle', 'diamond', 'pill']).describe('Visual shape of the node'),
  color_override: z.string().optional().describe('Override palette color for this specific node'),
})

const EdgeSchema = z.object({
  id: z.string().describe('Unique identifier'),
  from: z.string().describe('Source node ID'),
  to: z.string().describe('Target node ID'),
  label: z.string().optional().describe('Short label on the edge (max 2 words)'),
  style: z.enum(['solid', 'dashed', 'dotted']),
  directed: z.boolean().describe('True for arrows, false for bidirectional/undirected'),
  weight: z.enum(['thin', 'normal', 'thick']).describe('Visual weight of the line'),
  color_override: z.string().optional(),
})

const GroupSchema = z.object({
  id: z.string(),
  label: z.string().describe('Group/cluster label'),
  members: z.array(z.string()).describe('Array of node IDs belonging to this group'),
  color: z.string().describe('Hex color for this group background'),
})

export const SceneGraphSchema = z.object({
  title: z.string().describe('Concise title of the diagram'),
  layout_type: z.enum(['hierarchical', 'radial', 'network', 'timeline', 'cluster'])
    .describe('Dominant visual layout strategy'),
  palette: PaletteSchema,
  nodes: z.array(NodeSchema).min(3).max(30),
  edges: z.array(EdgeSchema),
  groups: z.array(GroupSchema).optional(),
})

export type SceneGraph = z.infer<typeof SceneGraphSchema>

// ── Prompt per Gemini ─────────────────────────────────────────────────────────

const SCHEMA_SYSTEM_PROMPT = `You are an expert information architect and visual designer specializing in conceptual diagrams.

Given a text description, generate a structured scene graph for a conceptual diagram with these rules:

LAYOUT PRINCIPLES:
- x, y are normalized 0.0 to 1.0 (0,0 = top-left, 1,0 = top-right, 0,1 = bottom-left)
- Nodes must NOT overlap. Minimum distance between node centers: 0.18 (horizontal), 0.12 (vertical)
- Size mapping: large nodes are ~0.18×0.07 in normalized space, medium ~0.14×0.05, small ~0.10×0.04
- For hierarchical: root at top center (0.5, 0.1), children spread below
- For radial: central node at (0.5, 0.5), others distributed around it
- For network: distribute evenly across canvas with clusters where logical
- For timeline: nodes flow left-to-right at similar y values

VISUAL DESIGN:
- Choose a cohesive, professional color palette (dark theme or light, never garish)
- Root/important nodes get 'large' + 'rounded' or 'circle' shape
- Process nodes get 'diamond' shape
- Data/storage nodes get 'rect' shape
- Annotations get 'pill' shape
- Use dashed edges for optional/indirect relationships
- Use thick edges for primary/critical paths

LABEL QUALITY:
- Labels: max 3 words, clear and descriptive
- Sublabels: optional, provide context in 4-6 words max
- Edge labels: 1-2 words maximum, only when essential

COMPLEXITY CALIBRATION:
- Simple topic: 4-8 nodes
- Moderate topic: 9-16 nodes
- Complex topic: 17-25 nodes
- Never exceed 25 nodes (visual clarity degrades)

Return ONLY valid JSON matching the schema. No markdown, no explanations.`

// ── Stage 1: Gemini genera il Scene Graph ─────────────────────────────────────

export async function generateSceneGraph(prompt: string): Promise<SceneGraph> {
  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: SceneGraphSchema,
    system: SCHEMA_SYSTEM_PROMPT,
    prompt: `Generate a conceptual diagram for: ${prompt}`,
  })
  return object
}

// ── Stage 2: Scene Graph → SVG ────────────────────────────────────────────────

const W = 1200
const H = 800

// Dimensioni nodo per tipo size
const NODE_DIMS: Record<string, { w: number; h: number; rx: number }> = {
  large:  { w: 180, h: 64,  rx: 12 },
  medium: { w: 148, h: 52,  rx: 10 },
  small:  { w: 116, h: 40,  rx: 8  },
}

const FONT_SIZE: Record<string, number> = {
  large: 14, medium: 12, small: 11,
}

const STROKE_WIDTH: Record<string, number> = {
  thin: 1, normal: 1.5, thick: 3,
}

function px(nx: number): number { return Math.round(nx * W) }
function py(ny: number): number { return Math.round(ny * H) }

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Calcola il punto di bordo del nodo più vicino a un altro punto
function nodeEdgePoint(
  node: SceneGraph['nodes'][0],
  targetX: number,
  targetY: number
): { x: number; y: number } {
  const cx = px(node.x)
  const cy = py(node.y)
  const dims = NODE_DIMS[node.size]
  const hw = dims.w / 2
  const hh = dims.h / 2

  const dx = targetX - cx
  const dy = targetY - cy
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx === 0 && absDy === 0) return { x: cx, y: cy }

  // Per cerchi usiamo il raggio (hw)
  if (node.shape === 'circle') {
    const r = hw
    const len = Math.sqrt(dx * dx + dy * dy)
    return { x: cx + (dx / len) * r, y: cy + (dy / len) * r }
  }

  // Per diamante
  if (node.shape === 'diamond') {
    const scale = Math.min(hw / absDx, hh / absDy)
    return { x: cx + dx * scale, y: cy + dy * scale }
  }

  // Rect / rounded / pill: clamp al bordo del rettangolo
  const scaleX = hw / absDx
  const scaleY = hh / absDy
  const scale = Math.min(scaleX, scaleY)
  return { x: cx + dx * scale, y: cy + dy * scale }
}

function renderNode(node: SceneGraph['nodes'][0], palette: SceneGraph['palette']): string {
  const cx = px(node.x)
  const cy = py(node.y)
  const dims = NODE_DIMS[node.size]
  const hw = dims.w / 2
  const hh = dims.h / 2
  const fs = FONT_SIZE[node.size]

  const fillColor = node.color_override ?? (
    node.type === 'root' ? palette.node_primary :
    node.type === 'primary' ? palette.node_primary :
    node.type === 'secondary' ? palette.node_secondary :
    node.type === 'annotation' ? palette.accent :
    palette.node_leaf
  )

  // Contrasto automatico del testo
  const r = parseInt(fillColor.slice(1, 3), 16)
  const g = parseInt(fillColor.slice(3, 5), 16)
  const b = parseInt(fillColor.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const textColor = luminance > 0.5 ? palette.text_on_light : palette.text_on_dark

  let shape = ''

  if (node.shape === 'circle') {
    shape = `<circle cx="${cx}" cy="${cy}" r="${hw}" fill="${fillColor}" stroke="${palette.background}" stroke-width="2"/>`
  } else if (node.shape === 'diamond') {
    const pts = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`
    shape = `<polygon points="${pts}" fill="${fillColor}" stroke="${palette.background}" stroke-width="2"/>`
  } else if (node.shape === 'pill') {
    shape = `<rect x="${cx - hw}" y="${cy - hh}" width="${dims.w}" height="${dims.h}" rx="${hh}" fill="${fillColor}" stroke="${palette.background}" stroke-width="1.5"/>`
  } else {
    const rx = node.shape === 'rect' ? 4 : dims.rx
    shape = `<rect x="${cx - hw}" y="${cy - hh}" width="${dims.w}" height="${dims.h}" rx="${rx}" fill="${fillColor}" stroke="${palette.background}" stroke-width="2"/>`
  }

  const labelY = node.sublabel ? cy - 6 : cy + 1
  const label = `<text x="${cx}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${fs}" font-weight="${node.type === 'root' ? 700 : node.type === 'primary' ? 600 : 500}" fill="${textColor}">${escapeXml(node.label)}</text>`

  const sublabel = node.sublabel
    ? `<text x="${cx}" y="${cy + fs}" text-anchor="middle" dominant-baseline="middle" font-family="system-ui,-apple-system,sans-serif" font-size="${fs - 2}" font-weight="400" fill="${textColor}" opacity="0.75">${escapeXml(node.sublabel)}</text>`
    : ''

  return `  <g id="node-${escapeXml(node.id)}" data-type="${node.type}" data-label="${escapeXml(node.label)}">\n    ${shape}\n    ${label}\n    ${sublabel}\n  </g>`
}

function renderEdge(
  edge: SceneGraph['edges'][0],
  nodeMap: Map<string, SceneGraph['nodes'][0]>,
  palette: SceneGraph['palette']
): string {
  const fromNode = nodeMap.get(edge.from)
  const toNode = nodeMap.get(edge.to)
  if (!fromNode || !toNode) return ''

  const tx = px(toNode.x)
  const ty = py(toNode.y)
  const fx = px(fromNode.x)
  const fy = py(fromNode.y)

  const fromPt = nodeEdgePoint(fromNode, tx, ty)
  const toPt = nodeEdgePoint(toNode, fx, fy)

  const color = edge.color_override ?? palette.edge
  const sw = STROKE_WIDTH[edge.weight]
  const dash = edge.style === 'dashed' ? 'stroke-dasharray="8 4"' : edge.style === 'dotted' ? 'stroke-dasharray="2 3"' : ''
  const markerEnd = edge.directed ? `marker-end="url(#arrow-${encodeURIComponent(color.replace('#', ''))})"` : ''

  // Curva quadratica per evitare linee troppo rigide
  const midX = (fromPt.x + toPt.x) / 2
  const midY = (fromPt.y + toPt.y) / 2
  const curvature = 0.15
  const dx = toPt.x - fromPt.x
  const dy = toPt.y - fromPt.y
  const cpX = midX - dy * curvature
  const cpY = midY + dx * curvature

  const pathD = `M ${fromPt.x} ${fromPt.y} Q ${cpX} ${cpY} ${toPt.x} ${toPt.y}`

  const edgeLabel = edge.label
    ? `<text x="${cpX}" y="${cpY - 6}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="${color}" opacity="0.85">${escapeXml(edge.label)}</text>`
    : ''

  return `  <g id="edge-${escapeXml(edge.id)}">\n    <path d="${pathD}" fill="none" stroke="${color}" stroke-width="${sw}" ${dash} ${markerEnd} opacity="0.75"/>\n    ${edgeLabel}\n  </g>`
}

function renderGroup(
  group: NonNullable<SceneGraph['groups']>[0],
  nodeMap: Map<string, SceneGraph['nodes'][0]>,
  palette: SceneGraph['palette']
): string {
  const members = group.members.map(id => nodeMap.get(id)).filter(Boolean) as SceneGraph['nodes'][0][]
  if (members.length === 0) return ''

  const padding = 28
  const xs = members.map(n => px(n.x))
  const ys = members.map(n => py(n.y))
  const dims = members.map(n => NODE_DIMS[n.size])

  const minX = Math.min(...xs.map((x, i) => x - dims[i].w / 2)) - padding
  const minY = Math.min(...ys.map((y, i) => y - dims[i].h / 2)) - padding
  const maxX = Math.max(...xs.map((x, i) => x + dims[i].w / 2)) + padding
  const maxY = Math.max(...ys.map((y, i) => y + dims[i].h / 2)) + padding

  const color = group.color ?? palette.accent
  const fillRgba = hexToRgba(color, 0.08)
  const strokeRgba = hexToRgba(color, 0.35)

  return `  <g id="group-${escapeXml(group.id)}" data-label="${escapeXml(group.label)}">
    <rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" rx="16" fill="${fillRgba}" stroke="${strokeRgba}" stroke-width="1.5" stroke-dasharray="6 3"/>
    <text x="${minX + 12}" y="${minY + 18}" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="${color}" opacity="0.7" text-transform="uppercase" letter-spacing="1">${escapeXml(group.label)}</text>
  </g>`
}

// Colleziona tutti i colori edge unici per generare marker frecce
function collectEdgeColors(edges: SceneGraph['edges'], defaultColor: string): Set<string> {
  const colors = new Set<string>()
  colors.add(defaultColor)
  for (const e of edges) {
    if (e.color_override) colors.add(e.color_override)
  }
  return colors
}

function renderArrowMarkers(colors: Set<string>): string {
  return [...colors].map(color => {
    const id = `arrow-${color.replace('#', '')}`
    return `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}" opacity="0.75"/></marker>`
  }).join('\n    ')
}

// ── Assemblaggio SVG finale ───────────────────────────────────────────────────

export function assembleSceneGraphSVG(sg: SceneGraph): string {
  const nodeMap = new Map(sg.nodes.map(n => [n.id, n]))

  const edgeColors = collectEdgeColors(sg.edges, sg.palette.edge)

  const groupsLayer = (sg.groups ?? []).map(g => renderGroup(g, nodeMap, sg.palette)).filter(Boolean).join('\n')
  const edgesLayer = sg.edges.map(e => renderEdge(e, nodeMap, sg.palette)).filter(Boolean).join('\n')
  const nodesLayer = sg.nodes.map(n => renderNode(n, sg.palette)).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    ${renderArrowMarkers(edgeColors)}
  </defs>

  <!-- Background -->
  <g id="layer-background">
    <rect width="${W}" height="${H}" fill="${sg.palette.background}"/>
  </g>

  <!-- Title -->
  <g id="layer-title">
    <text x="24" y="32" font-family="system-ui,-apple-system,sans-serif" font-size="16" font-weight="700" fill="${sg.palette.accent}" opacity="0.6">${escapeXml(sg.title)}</text>
  </g>

  <!-- Groups / Clusters -->
  <g id="layer-groups">
${groupsLayer}
  </g>

  <!-- Edges / Connections -->
  <g id="layer-edges">
${edgesLayer}
  </g>

  <!-- Nodes -->
  <g id="layer-nodes">
${nodesLayer}
  </g>
</svg>`
}

// ── Entry point pubblico ──────────────────────────────────────────────────────

export async function generateConceptualSchema(prompt: string): Promise<{
  svg: string
  sceneGraph: SceneGraph
}> {
  const sceneGraph = await generateSceneGraph(prompt)
  const svg = assembleSceneGraphSVG(sceneGraph)
  return { svg, sceneGraph }
}
