/**
 * bezier-utils.ts
 * Cubic Bézier path utilities for the vector pen tool.
 * All coordinates are in canvas (absolute) space.
 */

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface BzAnchor {
  x: number; y: number          // on-curve anchor point
  cp1x: number; cp1y: number    // incoming handle (before this anchor)
  cp2x: number; cp2y: number    // outgoing handle (after this anchor)
  /** true = sharp corner (handles independent), false = smooth (handles mirrored) */
  corner: boolean
}

export interface BzHit {
  segIdx: number   // index of the segment (anchor[segIdx] → anchor[segIdx+1])
  t: number        // parameter 0..1 along that segment
  x: number        // world-space x of hit point
  y: number        // world-space y of hit point
  dist: number     // distance from query point
}

// ─── PATH GENERATION ─────────────────────────────────────────────────────────

/** Convert anchors to an SVG path string (M … C … [Z]) */
export function anchorsToBzPath(anchors: BzAnchor[], closed = false): string {
  if (anchors.length < 1) return ''
  let d = `M ${anchors[0].x} ${anchors[0].y}`
  for (let i = 1; i < anchors.length; i++) {
    const p = anchors[i - 1], c = anchors[i]
    d += ` C ${p.cp2x} ${p.cp2y} ${c.cp1x} ${c.cp1y} ${c.x} ${c.y}`
  }
  if (closed && anchors.length > 2) {
    const last = anchors[anchors.length - 1], first = anchors[0]
    d += ` C ${last.cp2x} ${last.cp2y} ${first.cp1x} ${first.cp1y} ${first.x} ${first.y} Z`
  }
  return d
}

/** Create a default anchor with coincident handles (sharp corner) */
export function makeAnchor(x: number, y: number): BzAnchor {
  return { x, y, cp1x: x, cp1y: y, cp2x: x, cp2y: y, corner: true }
}

/** Create a smooth anchor from a drag vector (mouse dragged from anchor) */
export function makeSmoothAnchor(x: number, y: number, dx: number, dy: number): BzAnchor {
  return {
    x, y,
    cp1x: x - dx, cp1y: y - dy,  // mirrored incoming
    cp2x: x + dx, cp2y: y + dy,  // outgoing = drag direction
    corner: false,
  }
}

// ─── DE CASTELJAU SPLIT ───────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function lerpP(a: {x:number;y:number}, b: {x:number;y:number}, t: number) {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

interface CubicSeg { p0:{x:number;y:number}; cp1:{x:number;y:number}; cp2:{x:number;y:number}; p1:{x:number;y:number} }

function splitCubic(seg: CubicSeg, t: number): [CubicSeg, CubicSeg] {
  const { p0, cp1, cp2, p1 } = seg
  const m1  = lerpP(p0,  cp1, t)
  const m2  = lerpP(cp1, cp2, t)
  const m3  = lerpP(cp2, p1,  t)
  const m12 = lerpP(m1,  m2,  t)
  const m23 = lerpP(m2,  m3,  t)
  const mid = lerpP(m12, m23, t)
  return [
    { p0, cp1: m1, cp2: m12, p1: mid },
    { p0: mid, cp1: m23, cp2: m3, p1 },
  ]
}

// ─── CLOSEST POINT (for scissors) ────────────────────────────────────────────

/** Sample each cubic segment at N steps and return the closest hit. */
export function closestOnBzPath(anchors: BzAnchor[], px: number, py: number, samples = 40): BzHit {
  let best: BzHit = { segIdx: 0, t: 0, x: anchors[0].x, y: anchors[0].y, dist: Infinity }

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i], b = anchors[i + 1]
    for (let j = 0; j <= samples; j++) {
      const t  = j / samples
      const it = 1 - t
      const x  = it**3 * a.x + 3*it**2*t * a.cp2x + 3*it*t**2 * b.cp1x + t**3 * b.x
      const y  = it**3 * a.y + 3*it**2*t * a.cp2y + 3*it*t**2 * b.cp1y + t**3 * b.y
      const dist = Math.hypot(x - px, y - py)
      if (dist < best.dist) best = { segIdx: i, t, x, y, dist }
    }
  }

  // Newton-Raphson refinement around the best sample
  {
    const i   = best.segIdx
    const a   = anchors[i], b = anchors[i + 1]
    let   t   = best.t
    const seg: CubicSeg = { p0:{x:a.x,y:a.y}, cp1:{x:a.cp2x,y:a.cp2y}, cp2:{x:b.cp1x,y:b.cp1y}, p1:{x:b.x,y:b.y} }
    for (let iter = 0; iter < 8; iter++) {
      const it = 1 - t
      const bx = it**3*seg.p0.x + 3*it**2*t*seg.cp1.x + 3*it*t**2*seg.cp2.x + t**3*seg.p1.x
      const by = it**3*seg.p0.y + 3*it**2*t*seg.cp1.y + 3*it*t**2*seg.cp2.y + t**3*seg.p1.y
      const dx = bx - px, dy = by - py
      // first derivative
      const dbx = 3*(it**2*(seg.cp1.x-seg.p0.x) + 2*it*t*(seg.cp2.x-seg.cp1.x) + t**2*(seg.p1.x-seg.cp2.x))
      const dby = 3*(it**2*(seg.cp1.y-seg.p0.y) + 2*it*t*(seg.cp2.y-seg.cp1.y) + t**2*(seg.p1.y-seg.cp2.y))
      const denom = dbx*dbx + dby*dby
      if (denom < 1e-10) break
      t -= (dx*dbx + dy*dby) / denom
      t = Math.max(0, Math.min(1, t))
    }
    const it = 1 - t
    best.t = t
    best.x = it**3*seg.p0.x + 3*it**2*t*seg.cp1.x + 3*it*t**2*seg.cp2.x + t**3*seg.p1.x
    best.y = it**3*seg.p0.y + 3*it**2*t*seg.cp1.y + 3*it*t**2*seg.cp2.y + t**3*seg.p1.y
    best.dist = Math.hypot(best.x - px, best.y - py)
  }

  return best
}

// ─── SPLIT PATH AT HIT ────────────────────────────────────────────────────────

/**
 * Split a bezier path into two paths at a given BzHit.
 * Returns [leftAnchors, rightAnchors].
 */
export function splitBzPath(anchors: BzAnchor[], hit: BzHit): [BzAnchor[], BzAnchor[]] {
  const { segIdx, t, x, y } = hit
  const a = anchors[segIdx], b = anchors[segIdx + 1]

  const seg: CubicSeg = {
    p0:  { x: a.x,    y: a.y    },
    cp1: { x: a.cp2x, y: a.cp2y },
    cp2: { x: b.cp1x, y: b.cp1y },
    p1:  { x: b.x,    y: b.y    },
  }
  const [left, right] = splitCubic(seg, t)

  // New anchor AT the split point
  const splitAnchor: BzAnchor = {
    x, y,
    cp1x: left.cp2.x,  cp1y: left.cp2.y,   // incoming = left segment's last cp
    cp2x: right.cp1.x, cp2y: right.cp1.y,  // outgoing = right segment's first cp
    corner: false,
  }

  // Left path: anchors[0..segIdx] + splitAnchor (with updated cp2 on last pre-split anchor)
  const leftAnchors: BzAnchor[] = anchors.slice(0, segIdx + 1).map((an, i) =>
    i === segIdx ? { ...an, cp2x: left.cp1.x, cp2y: left.cp1.y } : { ...an }
  )
  leftAnchors.push({ ...splitAnchor, cp2x: splitAnchor.x, cp2y: splitAnchor.y })

  // Right path: splitAnchor + anchors[segIdx+1..end] (with updated cp1 on first post-split anchor)
  const rightAnchors: BzAnchor[] = [
    { ...splitAnchor, cp1x: splitAnchor.x, cp1y: splitAnchor.y },
    ...anchors.slice(segIdx + 1).map((an, i) =>
      i === 0 ? { ...an, cp1x: right.cp2.x, cp1y: right.cp2.y } : { ...an }
    ),
  ]

  return [leftAnchors, rightAnchors]
}

/**
 * Insert a new anchor into a bezier path at a given hit point.
 * Updates the handles of the neighbors and returns the new full anchor array.
 */
export function insertAnchorAt(anchors: BzAnchor[], hit: BzHit): BzAnchor[] {
  const { segIdx, t, x, y } = hit
  if (segIdx < 0 || segIdx >= anchors.length - 1) return anchors

  const a = anchors[segIdx], b = anchors[segIdx + 1]
  const seg: CubicSeg = {
    p0:  { x: a.x,    y: a.y    },
    cp1: { x: a.cp2x, y: a.cp2y },
    cp2: { x: b.cp1x, y: b.cp1y },
    p1:  { x: b.x,    y: b.y    },
  }
  const [left, right] = splitCubic(seg, t)

  const newAnchor: BzAnchor = {
    x, y,
    cp1x: left.cp2.x,  cp1y: left.cp2.y,
    cp2x: right.cp1.x, cp2y: right.cp1.y,
    corner: false,
  }

  const result = [...anchors]
  // Update handle of the previous anchor
  result[segIdx] = { ...a, cp2x: left.cp1.x, cp2y: left.cp1.y }
  // Update handle of the next anchor
  result[segIdx + 1] = { ...b, cp1x: right.cp2.x, cp1y: right.cp2.y }
  // Insert new anchor
  result.splice(segIdx + 1, 0, newAnchor)
  return result
}

// ─── MIRROR HANDLE ────────────────────────────────────────────────────────────

/**
 * When a smooth anchor's handle is moved, mirror the other handle.
 * Preserves the length of the other handle (symmetric = same length, smooth = keep opposite length).
 */
export function mirrorHandle(
  anchor: BzAnchor,
  moved: 'cp1' | 'cp2',
  newX: number, newY: number,
  symmetric = false,
): BzAnchor {
  if (anchor.corner) return anchor  // independent handles, no mirror
  const dx = newX - anchor.x, dy = newY - anchor.y
  const len = Math.hypot(dx, dy)
  if (moved === 'cp2') {
    if (symmetric || len === 0) {
      return { ...anchor, cp2x: newX, cp2y: newY, cp1x: anchor.x - dx, cp1y: anchor.y - dy }
    }
    // Preserve cp1 length
    const len1 = Math.hypot(anchor.cp1x - anchor.x, anchor.cp1y - anchor.y)
    const scale = len1 / len
    return { ...anchor, cp2x: newX, cp2y: newY, cp1x: anchor.x - dx*scale, cp1y: anchor.y - dy*scale }
  } else {
    if (symmetric || len === 0) {
      return { ...anchor, cp1x: newX, cp1y: newY, cp2x: anchor.x - dx, cp2y: anchor.y - dy }
    }
    const len2 = Math.hypot(anchor.cp2x - anchor.x, anchor.cp2y - anchor.y)
    const scale = len2 / len
    return { ...anchor, cp1x: newX, cp1y: newY, cp2x: anchor.x - dx*scale, cp2y: anchor.y - dy*scale }
  }
}
