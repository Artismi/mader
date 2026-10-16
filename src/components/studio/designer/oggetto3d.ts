/**
 * Mattone "oggetto 3D": forme semplici, testo o segno estruso, materiali
 * (plastica, cromo, oro, vetro, argilla, olografico), renderizzati con three
 * (WebGL, luce d'ambiente RoomEnvironment) in un'immagine con fondo
 * trasparente che si compone nella tavola come un ornamento.
 */
import type { Oggetto3D } from './types'
import { carattereDi } from './asset/catalogo'

// @types/three non è installato (vedi src/types/three-webgpu.d.ts): il core arriva senza tipi
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const caricaThree = (): Promise<any> => import('three') // eslint-disable-line @typescript-eslint/no-explicit-any
type Three = Awaited<ReturnType<typeof caricaThree>>

export const FORME_3D = ['sfera', 'toro', 'cubo', 'cilindro', 'disco', 'capsula', 'nodo', 'testo'] as const
export const MATERIALI_3D = ['plastica', 'cromo', 'oro', 'vetro', 'argilla', 'olografico'] as const

/** Il testo come forme di three: con opentype.js dal file del carattere (catalogo), altrimenti col font di three. */
async function formeTesto(THREE: Three, testo: string, famiglia?: string) {
  const file = famiglia ? carattereDi(famiglia)?.file?.slice().sort((a, b) => Math.abs((b.peso ?? 400) - 800) - Math.abs((a.peso ?? 400) - 800)).pop() : undefined
  if (file) {
    try {
      const opentype = (await import('opentype.js')).default
      const buf = await (await fetch(file.url)).arrayBuffer()
      const font = opentype.parse(buf)
      const sp = new THREE.ShapePath()
      // opentype ha la y verso il basso: si capovolge
      for (const c of font.getPath(testo, 0, 0, 100).commands) {
        if (c.type === 'M') sp.moveTo(c.x, -c.y)
        else if (c.type === 'L') sp.lineTo(c.x, -c.y)
        else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y)
        else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y)
      }
      const shapes = sp.toShapes(true)
      if (shapes.length) return shapes
    } catch (e) { console.warn('[designer] 3d testo', e) }
  }
  const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js')
  const json = (await import('three/examples/fonts/helvetiker_bold.typeface.json')).default
  return new FontLoader().parse(json as never).generateShapes(testo, 100)
}

function materiale(THREE: Three, m: Oggetto3D['materiale'], colore: string) {
  const c = new THREE.Color(colore)
  switch (m) {
    case 'cromo': return new THREE.MeshPhysicalMaterial({ color: c.clone().lerp(new THREE.Color('#ffffff'), 0.6), metalness: 1, roughness: 0.08 })
    case 'oro': return new THREE.MeshPhysicalMaterial({ color: '#e8b04a', metalness: 1, roughness: 0.22 })
    case 'vetro': return new THREE.MeshPhysicalMaterial({ color: c, transmission: 0.92, thickness: 1.2, roughness: 0.05, ior: 1.45, transparent: true })
    case 'argilla': return new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 })
    case 'olografico': return new THREE.MeshPhysicalMaterial({ color: c.clone().lerp(new THREE.Color('#ffffff'), 0.4), metalness: 0.6, roughness: 0.15, iridescence: 1, iridescenceIOR: 1.8 })
    default: return new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 })
  }
}

/** Disegna l'oggetto in un canvas w×h con fondo trasparente. */
export async function disegnaOggetto3D(o: Oggetto3D, w: number, h: number): Promise<HTMLCanvasElement> {
  const THREE = await caricaThree()
  const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
  const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.round(w)); cv.height = Math.max(2, Math.round(h))
  const renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const pm = new THREE.PMREMGenerator(renderer)
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
  const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(3, 4, 5); scene.add(key)
  scene.add(new THREE.HemisphereLight('#ffffff', o.colore2 ?? '#333333', 0.6))

  let geo: Three
  switch (o.forma) {
    case 'sfera': geo = new THREE.SphereGeometry(1, 96, 64); break
    case 'toro': geo = new THREE.TorusGeometry(0.9, 0.38, 64, 160); break
    case 'cubo': { const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js'); geo = new RoundedBoxGeometry(1.5, 1.5, 1.5, 6, 0.18); break }
    case 'cilindro': geo = new THREE.CylinderGeometry(0.85, 0.85, 1.7, 96); break
    case 'disco': geo = new THREE.CylinderGeometry(1.2, 1.2, 0.22, 128); break
    case 'capsula': geo = new THREE.CapsuleGeometry(0.55, 1.3, 16, 64); break
    case 'nodo': geo = new THREE.TorusKnotGeometry(0.75, 0.26, 256, 48, 2, 3); break
    default: {
      const shapes = await formeTesto(THREE, (o.testo || 'A').slice(0, 3), o.famiglia)
      geo = new THREE.ExtrudeGeometry(shapes, { depth: 28, bevelEnabled: true, bevelThickness: 4, bevelSize: 2.5, bevelSegments: 6, curveSegments: 24 })
    }
  }
  geo.computeBoundingBox(); geo.center()
  const mesh = new THREE.Mesh(geo, materiale(THREE, o.materiale, o.colore))
  // l'oggetto riempie l'inquadratura: scala sulla diagonale del suo ingombro
  const bb = new THREE.Box3().setFromObject(mesh), dim = bb.getSize(new THREE.Vector3())
  mesh.scale.setScalar(2.2 / Math.max(dim.x, dim.y, dim.z * 0.8))
  mesh.rotation.set(((o.inclina ?? -18) * Math.PI) / 180, ((o.gira ?? 28) * Math.PI) / 180, ((o.angolo ?? 0) * Math.PI) / 180)
  scene.add(mesh)
  const cam = new THREE.PerspectiveCamera(30, cv.width / cv.height, 0.1, 100)
  cam.position.set(0, 0, 5.6 / Math.min(1, cv.width / cv.height))
  renderer.render(scene, cam)
  const out = document.createElement('canvas'); out.width = cv.width; out.height = cv.height
  out.getContext('2d')!.drawImage(cv, 0, 0)
  pm.dispose(); geo.dispose(); renderer.dispose()
  return out
}
