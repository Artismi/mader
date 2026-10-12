import type * as fabric from 'fabric'

/**
 * Proprietà "nostre" da salvare insieme agli oggetti Fabric.
 * In Fabric 7 `canvas.toJSON()` NON accetta un elenco di proprietà extra:
 * senza `toObject(SERIAL_PROPS)` tavole, nomi, id ed effetti si perdevano
 * a ogni annulla/ripeti e a ogni salvataggio.
 */
export const SERIAL_PROPS = [
  // identità e collegamenti
  'objId', 'name', 'parentBoard',
  'isArtboard', 'artboardExportType',
  'hasStartArrow', 'hasEndArrow', 'isConnector', 'startObjId', 'endObjId', 'vertexConnections',
  '_bzAnchors', '_isBricolage',
  // video / sottotitoli
  'isVideo', 'isSubtitle', 'startTime', 'endTime',
  // effetti (motore fx) e Lab
  'fx', 'adjust', 'look', 'labParams', 'fxRef',
  // blocchi del livello
  'selectable', 'evented', 'hasControls',
  'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation',
]

export function serializeCanvas(canvas: fabric.StaticCanvas): string {
  return JSON.stringify(canvas.toObject(SERIAL_PROPS))
}
