/**
 * Creative OS — Artistic Engine 2.0 (Constraint-Based)
 * Powered by @lume/kiwi for precise linear constraint solving.
 */

import * as kiwi from '@lume/kiwi'

export interface LayoutElement {
  id: string
  type: 'rect' | 'circle' | 'text' | 'line' | 'image' | 'path'
  x: number
  y: number
  w?: number
  h?: number
  color?: string
  opacity?: number
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  textAlign?: string
  text?: string
  zIndex?: number
  style?: string // context hint: 'swiss', 'brutalist', 'minimal'
  [key: string]: any
}

export interface LayoutBoard {
  name: string
  width: number
  height: number
  backgroundColor: string
  elements: LayoutElement[]
}

export interface SolveResult {
  board: LayoutBoard
  report: string[]
}

/**
 * Main entry point for Artistic Brain 2.0
 */
export function solveBoard(board: LayoutBoard, contextStyle?: string): SolveResult {
  const report: string[] = []
  const style = contextStyle || board.elements.find(e => e.style)?.style || 'minimal'
  let solvedElements = [...board.elements]

  // 1. Initial Cleanup (Standard rules: Contrast & Margins)
  solvedElements = applyBasicGuardrails(board, solvedElements, report)

  // 2. Constraint Solving (Vertical Evolution: Kiwi)
  if (style === 'swiss' || style === 'minimal') {
    solvedElements = solveLayoutWithKiwi(board, solvedElements, report, style)
  }

  // 3. Visual Balance (Vertical Evolution)
  if (style !== 'swiss') {
    solvedElements = applyVisualBalance(board, solvedElements, report)
  }

  return {
    board: { ...board, elements: solvedElements },
    report
  }
}

/**
 * Basic guardrails: Contrast, Safe Zones, Hierarchy.
 */
function applyBasicGuardrails(board: LayoutBoard, elements: LayoutElement[], report: string[]): LayoutElement[] {
  const SAFE_MARGIN = 60
  const isDarkBg = isColorDark(board.backgroundColor)

  return elements.map(el => {
    const newEl = { ...el }
    
    // Contrast
    if (el.type === 'text') {
      const isDarkText = isColorDark(el.color || '#ffffff')
      if (isDarkBg && isDarkText) {
        newEl.color = '#FFFFFF'
        report.push(`[Contrast] "${el.id}" → Bianco (leggibilità)`)
      } else if (!isDarkBg && !isDarkText) {
        newEl.color = '#111111'
        report.push(`[Contrast] "${el.id}" → Scuro (leggibilità)`)
      }
    }

    // Border constraints
    if (newEl.x < 0) newEl.x = SAFE_MARGIN
    if (newEl.y < 0) newEl.y = SAFE_MARGIN
    if (newEl.x > board.width) newEl.x = board.width - SAFE_MARGIN
    if (newEl.y > board.height) newEl.y = board.height - SAFE_MARGIN

    return newEl
  })
}

/**
 * Use Kiwi Solver to align elements based on style.
 */
function solveLayoutWithKiwi(board: LayoutBoard, elements: LayoutElement[], report: string[], style: string): LayoutElement[] {
  const solver = new kiwi.Solver()
  const vars: Record<string, { x: kiwi.Variable; y: kiwi.Variable }> = {}

  elements.forEach(el => {
    vars[el.id] = {
      x: new kiwi.Variable(el.id + '_x'),
      y: new kiwi.Variable(el.id + '_y')
    }
    solver.addEditVariable(vars[el.id].x, kiwi.Strength.strong)
    solver.addEditVariable(vars[el.id].y, kiwi.Strength.strong)
    solver.suggestValue(vars[el.id].x, el.x)
    solver.suggestValue(vars[el.id].y, el.y)
  })

  // Example Global Constraint: Keep all text aligned if Swiss
  if (style === 'swiss') {
    const textElements = elements.filter(e => e.type === 'text')
    if (textElements.length > 1) {
      const firstX = vars[textElements[0].id].x
      for (let i = 1; i < textElements.length; i++) {
        solver.addConstraint(new kiwi.Constraint(vars[textElements[i].id].x, kiwi.Operator.Eq, firstX, kiwi.Strength.medium))
      }
      report.push(`[Solver] Applicato allineamento svizzero (asse x comune)`)
    }
  }

  solver.updateVariables()
  
  const guard = (v: number) => isNaN(v) || !isFinite(v) ? 0 : v

  return elements.map(el => ({
    ...el,
    x: guard(vars[el.id].x.value()),
    y: guard(vars[el.id].y.value())
  }))
}

/**
 * Calculates visual center of mass and nudges elements for balance.
 */
function applyVisualBalance(board: LayoutBoard, elements: LayoutElement[], report: string[]): LayoutElement[] {
  let totalWeight = 0
  let weightedX = 0
  let weightedY = 0

  elements.forEach(el => {
    const weight = (el.w || 100) * (el.h || 100) * (el.opacity || 1)
    totalWeight += weight
    weightedX += (el.x + (el.w || 0) / 2) * weight
    weightedY += (el.y + (el.h || 0) / 2) * weight
  })

  const visualCenter = { x: weightedX / totalWeight, y: weightedY / totalWeight }
  const boardCenter = { x: board.width / 2, y: board.height / 2 }

  const offsetX = boardCenter.x - visualCenter.x
  const offsetY = boardCenter.y - visualCenter.y

  if (Math.abs(offsetX) > 50 || Math.abs(offsetY) > 50) {
    report.push(`[Balance] Bilanciamento pesi visivi: spostamento globale di ${Math.round(offsetX)}px, ${Math.round(offsetY)}px`)
    return elements.map(el => ({
      ...el,
      x: el.x + offsetX * 0.5,
      y: el.y + offsetY * 0.5
    }))
  }

  return elements
}

function isColorDark(hex: string): boolean {
  if (!hex || hex === 'transparent') return true
  const h = hex.replace('#', '')
  if (h.length < 6) return true
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness < 128
}
