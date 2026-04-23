import * as fabric from 'fabric'

export type ProceduralType =
  | 'halftone'
  | 'dot_grid'
  | 'wave_lines'
  | 'zigzag_fill'
  | 'stripe_diagonal'
  | 'star_scatter'
  | 'crosshatch'
  | 'honeycomb'
  | 'organic_noise'
  | 'perspective_grid'
  | 'circuit_board'
  | 'memphis_mix'

export interface ProceduralOptions {
  width: number
  height: number
  color?: string
  density?: number   // 0.1 to 1.0
  radius?: number    // size of dots/units
  spacing?: number   // spacing between elements
  amplitude?: number // wave/zigzag amplitude
  angle?: number     // angle in degrees (stripe_diagonal)
  weight?: number    // line weight
}

export function generateProceduralPattern(type: ProceduralType, options: ProceduralOptions): fabric.Group {
  const { width, height, color = '#ffffff', density = 0.5, radius = 5 } = options
  const objects: fabric.FabricObject[] = []

  if (type === 'halftone') {
    // A matrix of circles with varying sizes based on sine wave
    const step = 25 - (density * 10)
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        const intensity = (Math.sin(x * 0.015) + Math.cos(y * 0.015)) * 0.5 + 0.5
        const r = radius * intensity
        if (r > 0.5) {
          objects.push(new fabric.Circle({
            left: x, top: y, radius: r, fill: color, originX: 'center', originY: 'center', selectable: false
          }))
        }
      }
    }
  }

  else if (type === 'dot_grid') {
    // Precise structural grid for Tech Blueprint style
    const step = 40 - (density * 15)
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        objects.push(new fabric.Circle({
          left: x, top: y, radius: radius * 0.3, fill: color, originX: 'center', originY: 'center', selectable: false
        }))
      }
    }
  }

  else if (type === 'wave_lines') {
    // Topographical waves using continuous paths
    const step = 50 - (density * 20)
    const amp = options.amplitude ?? 30
    for (let y = 0; y < height; y += step) {
      let pathData = `M 0 ${y} `
      for (let x = 0; x <= width; x += 40) {
        const yOffset = Math.sin(x * 0.01 + y) * amp * density
        pathData += `L ${x} ${y + yOffset} `
      }
      objects.push(new fabric.Path(pathData, {
        stroke: color, strokeWidth: Math.max(0.5, (options.weight ?? 1)), fill: 'transparent', selectable: false
      }))
    }
  }

  else if (type === 'zigzag_fill') {
    // Angular zigzag lines filling the surface — constructivism/brutalist
    const step = 30 - (density * 12)
    const amp = options.amplitude ?? 20
    for (let y = -amp; y < height + amp; y += step) {
      let pathData = `M 0 ${y} `
      let direction = 1
      for (let x = 0; x <= width; x += amp) {
        pathData += `L ${x} ${y + (direction * amp)} `
        direction *= -1
      }
      objects.push(new fabric.Path(pathData, {
        stroke: color, strokeWidth: Math.max(0.5, options.weight ?? 1.5), fill: 'transparent', selectable: false
      }))
    }
  }

  else if (type === 'stripe_diagonal') {
    // Diagonal stripes — barberpole / awning pattern
    const angleDeg = options.angle ?? 45
    const angleRad = (angleDeg * Math.PI) / 180
    const stripeGap = 20 + (1 - density) * 30
    const diag = Math.sqrt(width * width + height * height)
    const lineWeight = options.weight ?? 4

    for (let offset = -diag; offset < diag * 2; offset += stripeGap * 2) {
      // Each stripe: a thick line across the diagonal
      const cos = Math.cos(angleRad)
      const sin = Math.sin(angleRad)
      objects.push(new fabric.Path(
        `M ${offset * cos - diag * sin} ${offset * sin + diag * cos} L ${offset * cos + diag * sin} ${offset * sin - diag * cos}`,
        { stroke: color, strokeWidth: lineWeight, fill: 'transparent', selectable: false }
      ))
    }
  }

  else if (type === 'star_scatter') {
    // Randomly scattered stars — memphis/vaporwave
    const count = Math.floor(density * 80)
    const seed = 42
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random using golden ratio
      const px = ((i * 0.6180339887 * width) % width)
      const py = ((i * 0.3819660112 * height) % height)
      const r = radius * (0.5 + ((i * 137) % 100) / 200)
      const points = (i % 2 === 0) ? 4 : 6
      const starPath = buildStarPath(px, py, r, r * 0.4, points)
      objects.push(new fabric.Path(starPath, {
        fill: color, stroke: 'transparent', selectable: false
      }))
    }
  }

  else if (type === 'crosshatch') {
    // Cross-hatch lines — etching/engraving aesthetic
    const step = 20 - (density * 8)
    const lw = options.weight ?? 0.8

    // First direction (45°)
    for (let i = -height; i < width + height; i += step) {
      objects.push(new fabric.Path(`M ${i} 0 L ${i + height} ${height}`, {
        stroke: color, strokeWidth: lw, fill: 'transparent', selectable: false
      }))
    }
    // Cross direction (-45°)
    for (let i = -height; i < width + height; i += step) {
      objects.push(new fabric.Path(`M ${i} ${height} L ${i + height} 0`, {
        stroke: color, strokeWidth: lw * 0.7, fill: 'transparent', selectable: false
      }))
    }
  }

  else if (type === 'honeycomb') {
    // Hexagonal grid — biomimetic / technical
    const hexR = options.radius ?? 16
    const hexW = hexR * 2
    const hexH = Math.sqrt(3) * hexR
    const lw = options.weight ?? 1

    for (let row = -1; row < height / hexH + 1; row++) {
      for (let col = -1; col < width / (hexW * 0.75) + 1; col++) {
        const cx = col * hexW * 0.75
        const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2)
        const hexPath = buildHexPath(cx, cy, hexR * (0.8 + density * 0.2))
        objects.push(new fabric.Path(hexPath, {
          stroke: color, strokeWidth: lw, fill: 'transparent', selectable: false
        }))
      }
    }
  }

  else if (type === 'organic_noise') {
    // Soft blob noise — organic/art nouveau background texture
    const count = Math.floor(density * 40)
    for (let i = 0; i < count; i++) {
      const px = (i * 0.6180339887 * width) % width
      const py = (i * 0.3819660112 * height) % height
      const r = radius * (1 + ((i * 73) % 100) / 50)
      const blobPath = buildBlobPath(px, py, r, i)
      objects.push(new fabric.Path(blobPath, {
        fill: color, stroke: 'transparent', opacity: 0.4 + density * 0.3, selectable: false
      }))
    }
  }

  else if (type === 'perspective_grid') {
    // Converging grid lines toward center — retro futurism / synthwave
    const cx = width / 2
    const cy = height * 0.6   // horizon line
    const lw = options.weight ?? 0.8

    // Horizontal lines (receding)
    const hLines = Math.floor(density * 12) + 4
    for (let i = 0; i <= hLines; i++) {
      const y = cy + (i / hLines) * (height - cy)
      objects.push(new fabric.Path(`M 0 ${y} L ${width} ${y}`, {
        stroke: color, strokeWidth: lw * (0.3 + (i / hLines) * 0.7), fill: 'transparent', selectable: false
      }))
    }

    // Vertical lines (converging)
    const vLines = Math.floor(density * 16) + 6
    for (let i = 0; i <= vLines; i++) {
      const xBottom = (i / vLines) * width
      objects.push(new fabric.Path(`M ${cx} ${cy} L ${xBottom} ${height}`, {
        stroke: color, strokeWidth: lw * 0.6, fill: 'transparent', selectable: false
      }))
    }
  }

  else if (type === 'circuit_board') {
    // PCB trace aesthetic — orthogonal lines with nodes
    const step = 40 - (density * 15)
    const lw = options.weight ?? 1.5

    // Horizontal traces
    for (let y = 0; y < height; y += step) {
      let x = 0
      while (x < width) {
        const segLen = step * (1 + ((x + y) % 3))
        if (x + segLen < width) {
          // Draw segment
          objects.push(new fabric.Path(`M ${x} ${y} L ${x + segLen} ${y}`, {
            stroke: color, strokeWidth: lw, fill: 'transparent', selectable: false
          }))
          // Maybe add a vertical connector
          if ((x + y) % (step * 2) === 0) {
            const nextY = y + step
            if (nextY < height) {
              objects.push(new fabric.Path(`M ${x + segLen} ${y} L ${x + segLen} ${nextY}`, {
                stroke: color, strokeWidth: lw, fill: 'transparent', selectable: false
              }))
            }
          }
          // Node dot
          objects.push(new fabric.Circle({
            left: x + segLen, top: y, radius: lw * 1.5,
            fill: color, originX: 'center', originY: 'center', selectable: false
          }))
        }
        x += segLen + step
      }
    }
  }

  else if (type === 'memphis_mix') {
    // Memphis Group style — mix of triangles, circles, lines, rectangles
    const count = Math.floor(density * 50)
    for (let i = 0; i < count; i++) {
      const px = (i * 0.6180339887 * width) % width
      const py = (i * 0.3819660112 * height) % height
      const r = radius * (0.5 + ((i * 97) % 100) / 100)
      const variant = i % 5

      if (variant === 0) {
        // Dot
        objects.push(new fabric.Circle({
          left: px, top: py, radius: r,
          fill: color, selectable: false, originX: 'center', originY: 'center'
        }))
      } else if (variant === 1) {
        // Triangle
        const tp = `M ${px} ${py - r} L ${px + r * 0.87} ${py + r * 0.5} L ${px - r * 0.87} ${py + r * 0.5} Z`
        objects.push(new fabric.Path(tp, { fill: color, stroke: 'transparent', selectable: false }))
      } else if (variant === 2) {
        // Short line
        const angle = ((i * 137) % 180) * Math.PI / 180
        const x2 = px + Math.cos(angle) * r * 3
        const y2 = py + Math.sin(angle) * r * 3
        objects.push(new fabric.Path(`M ${px} ${py} L ${x2} ${y2}`, {
          stroke: color, strokeWidth: Math.max(1, r * 0.5), fill: 'transparent', selectable: false
        }))
      } else if (variant === 3) {
        // Square
        objects.push(new fabric.Rect({
          left: px - r, top: py - r, width: r * 2, height: r * 2,
          fill: 'transparent', stroke: color, strokeWidth: Math.max(0.8, r * 0.3),
          angle: (i * 30) % 45, selectable: false
        }))
      } else {
        // Ring
        objects.push(new fabric.Circle({
          left: px, top: py, radius: r,
          fill: 'transparent', stroke: color, strokeWidth: Math.max(0.8, r * 0.25),
          selectable: false, originX: 'center', originY: 'center'
        }))
      }
    }
  }

  // Create compound group
  const group = new fabric.Group(objects, {
    left: width / 2,
    top: height / 2,
    originX: 'center',
    originY: 'center',
    width, height
  })

  ;(group as any).isProcedural = true
  ;(group as any).proceduralType = type

  return group
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

function buildStarPath(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  let path = ''
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    path += (i === 0 ? 'M' : 'L') + ` ${x} ${y} `
  }
  return path + 'Z'
}

function buildHexPath(cx: number, cy: number, r: number): string {
  let path = ''
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    path += (i === 0 ? 'M' : 'L') + ` ${x} ${y} `
  }
  return path + 'Z'
}

function buildBlobPath(cx: number, cy: number, r: number, seed: number): string {
  // Irregular blob using cubic bezier curves
  const points = 5
  const variance = 0.3
  let path = ''
  const angles: number[] = []
  const radii: number[] = []

  for (let i = 0; i < points; i++) {
    angles.push((i / points) * Math.PI * 2)
    const noise = 1 + ((seed * i * 37 + 13) % 100) / 100 * variance * 2 - variance
    radii.push(r * noise)
  }

  for (let i = 0; i < points; i++) {
    const curr = i
    const next = (i + 1) % points
    const cx1 = cx + Math.cos(angles[curr] + 0.4) * radii[curr] * 1.1
    const cy1 = cy + Math.sin(angles[curr] + 0.4) * radii[curr] * 1.1
    const cx2 = cx + Math.cos(angles[next] - 0.4) * radii[next] * 1.1
    const cy2 = cy + Math.sin(angles[next] - 0.4) * radii[next] * 1.1
    const x = cx + Math.cos(angles[next]) * radii[next]
    const y = cy + Math.sin(angles[next]) * radii[next]

    if (i === 0) {
      path += `M ${cx + Math.cos(angles[0]) * radii[0]} ${cy + Math.sin(angles[0]) * radii[0]} `
    }
    path += `C ${cx1} ${cy1} ${cx2} ${cy2} ${x} ${y} `
  }

  return path + 'Z'
}
