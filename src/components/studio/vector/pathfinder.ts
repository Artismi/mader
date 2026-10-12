/**
 * Elaborazione tracciati, come il Pathfinder di Illustrator. L'ordine conta per
 * livello (chi sta sopra), non per ordine di selezione:
 * - Unisci: tutto in una forma, con lo stile di quella più in alto
 * - Sottrai: la forma più in basso meno tutte quelle sopra (Meno davanti)
 * - Interseca: solo l'area comune a tutte
 * - Escludi: le aree sovrapposte diventano buchi
 * - Dividi: ogni zona diventa un pezzo a sé, colorato come la forma più in alto che la copre
 * Gestisce più contorni e buchi (lettere vettorializzate, icone, gruppi).
 */
import * as fabric from 'fabric'
import polygonClipping, { type MultiPolygon } from 'polygon-clipping'
import { isShape, pathFromMP, styleOf, toMultiPolygon } from './geom'

export type PathOp = 'union' | 'subtract' | 'intersect' | 'exclude' | 'divide'

const MIN_AREA = 0.5

function area(mp: MultiPolygon) {
  let a = 0
  for (const poly of mp) poly.forEach((r, i) => {
    let s = 0
    for (let k = 0; k < r.length - 1; k++) s += r[k][0] * r[k + 1][1] - r[k + 1][0] * r[k][1]
    a += (i === 0 ? 1 : -1) * Math.abs(s / 2)
  })
  return a
}

/** Esegue l'operazione sulla selezione. Restituisce un messaggio se non si può fare. */
export function runPathOp(canvas: fabric.Canvas, op: PathOp): string | null {
  const all = canvas.getObjects()
  const objs = canvas.getActiveObjects()
    .filter(o => !(o as fabric.FabricObject & { isArtboard?: boolean }).isArtboard)
    .sort((a, b) => all.indexOf(a) - all.indexOf(b))
  if (objs.length < 2) return 'Seleziona almeno due forme.'
  const skipped = objs.filter(o => !isShape(o))
  if (skipped.length) return 'Testi e immagini non si possono combinare: vettorializzali prima (testo → tracciato, immagine → Vettorializza).'

  canvas.discardActiveObject() // coordinate di scena per tutti
  const shapes = objs.map(o => ({ o, mp: toMultiPolygon(o), style: styleOf(o) }))
  const top = shapes[shapes.length - 1], bottom = shapes[0]
  let result: fabric.FabricObject | null = null

  if (op === 'divide') {
    let pieces: { mp: MultiPolygon; style: ReturnType<typeof styleOf> }[] = []
    for (const s of shapes) {
      const next: typeof pieces = []
      for (const p of pieces) {
        const out = polygonClipping.difference(p.mp, s.mp)
        if (out.length) next.push({ mp: out, style: p.style })
        const inn = polygonClipping.intersection(p.mp, s.mp)
        if (inn.length) next.push({ mp: inn, style: s.style })
      }
      const covered = pieces.length ? polygonClipping.union(pieces[0].mp, ...pieces.slice(1).map(p => p.mp)) : []
      const fresh = covered.length ? polygonClipping.difference(s.mp, covered) : s.mp
      if (fresh.length) next.push({ mp: fresh, style: s.style })
      pieces = next
    }
    // ogni isola è un pezzo separato, come in Illustrator
    const paths = pieces.flatMap(p => p.mp.map(poly => ({ mp: [poly] as MultiPolygon, style: p.style })))
      .filter(p => area(p.mp) > MIN_AREA)
      .map(p => pathFromMP(p.mp, p.style))
    if (!paths.length) return 'Le forme non producono pezzi.'
    result = new fabric.Group(paths, { subTargetCheck: true, interactive: true } as never)
  } else {
    const mps = shapes.map(s => s.mp)
    let mp: MultiPolygon
    if (op === 'union') mp = polygonClipping.union(mps[0], ...mps.slice(1))
    else if (op === 'subtract') mp = polygonClipping.difference(mps[0], ...mps.slice(1))
    else if (op === 'intersect') mp = polygonClipping.intersection(mps[0], ...mps.slice(1))
    else mp = polygonClipping.xor(mps[0], ...mps.slice(1))
    if (!mp.length || area(mp) < MIN_AREA) {
      canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }))
      return op === 'intersect' ? 'Le forme non si sovrappongono.' : 'Il risultato è vuoto.'
    }
    result = pathFromMP(mp, op === 'subtract' ? bottom.style : top.style)
  }

  const at = all.indexOf(bottom.o)
  objs.forEach(o => canvas.remove(o))
  canvas.insertAt(Math.min(at, canvas.getObjects().length), result)
  result.setCoords()
  canvas.setActiveObject(result)
  canvas.fire('object:modified', { target: result })
  canvas.requestRenderAll()
  return null
}
