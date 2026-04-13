import * as fabric from 'fabric'

export type ProceduralType = 'halftone' | 'dot_grid' | 'wave_lines'

export interface ProceduralOptions {
  width: number
  height: number
  color?: string
  density?: number   // 0.1 to 1.0
  radius?: number    // size of dots/lines
}

export function generateProceduralPattern(type: ProceduralType, options: ProceduralOptions): fabric.Group {
  const { width, height, color = '#ffffff', density = 0.5, radius = 5 } = options
  const objects: fabric.FabricObject[] = []

  if (type === 'halftone') {
    // A matrix of overlapping circles with varying sizes
    const step = 25 - (density * 10)
    for (let x = 0; x < width; x += step) {
      for (let y = 0; y < height; y += step) {
        // Procedural spatial variation using sine waves
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
    // Topographical effect using continuous paths
    const step = 50 - (density * 20)
    for (let y = 0; y < height; y += step) {
      let pathData = `M 0 ${y} `
      for (let x = 0; x <= width; x += 40) {
        const yOffset = Math.sin(x * 0.01 + y) * 30 * density
        pathData += `L ${x} ${y + yOffset} `
      }
      objects.push(new fabric.Path(pathData, {
        stroke: color, strokeWidth: Math.max(1, radius * 0.2), fill: 'transparent', selectable: false
      }))
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
  
  // Custom markers
  ;(group as any).isProcedural = true;
  ;(group as any).proceduralType = type;

  return group
}
