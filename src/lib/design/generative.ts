/**
 * Generative Asset Engine — Creative OS 2.0
 * Pure JS / Canvas generators for procedural textures.
 */

import * as fabric from 'fabric'

export interface GenerativeOptions {
  width: number
  height: number
  color: string
  opacity?: number
  density?: number
  seed?: number
}

/**
 * Generates a high-quality Halftone pattern.
 */
export async function createHalftonePattern(options: GenerativeOptions): Promise<string> {
  const canvas = document.createElement('canvas')
  const size = 20
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const density = options.density || 0.5
  const radius = (size / 2) * density

  ctx.fillStyle = options.color
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2)
  ctx.fill()

  return canvas.toDataURL()
}

/**
 * Generates an Atomic/Technical grid pattern.
 */
export async function createAtomicGrid(options: GenerativeOptions): Promise<string> {
  const canvas = document.createElement('canvas')
  const size = 100
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.strokeStyle = options.color
  ctx.lineWidth = 0.5
  ctx.globalAlpha = options.opacity || 0.3

  // Crosshairs at corners
  const drawCross = (x: number, y: number) => {
    ctx.beginPath()
    ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y)
    ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5)
    ctx.stroke()
  }

  drawCross(0, 0)
  drawCross(size, 0)
  drawCross(0, size)
  drawCross(size, size)

  // Subtle dots
  ctx.fillStyle = options.color
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      ctx.beginPath()
      ctx.arc(i * 25, j * 25, 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return canvas.toDataURL()
}

/**
 * Generates a "Noise Grain" texture.
 */
export async function createNoiseTexture(options: GenerativeOptions): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const imageData = ctx.createImageData(256, 256)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.random() * 255
    data[i] = data[i+1] = data[i+2] = parseInt(options.color.slice(1,3), 16) || val
    data[i+3] = Math.random() * 50 // Subtle opacity noise
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL()
}
