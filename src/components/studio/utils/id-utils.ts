/** 
 * Returns (and lazily creates) a stable UUID for any object. 
 */
const getObjId = (obj: any): string => {
  if (!obj) return ''
  if (!obj.objId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      obj.objId = crypto.randomUUID()
    } else {
      obj.objId = 'obj_' + Math.random().toString(36).slice(2, 11) + '_' + Date.now()
    }
  }
  return obj.objId
}

export default getObjId
