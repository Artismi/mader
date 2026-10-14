// three non pubblica i tipi per gli entry point WebGPU/TSL e @types/three non è installato.
// Ogni nome usato come THREE.X serve sia come valore sia come tipo.
declare module 'three/webgpu' {
  export const WebGPURenderer: any; export type WebGPURenderer = any
  export const RenderTarget: any; export type RenderTarget = any
  export const CanvasTexture: any; export type CanvasTexture = any
  export const MeshBasicNodeMaterial: any; export type MeshBasicNodeMaterial = any
  export const PlaneGeometry: any; export type PlaneGeometry = any
  export const Scene: any; export type Scene = any
  export const OrthographicCamera: any; export type OrthographicCamera = any
  export const Mesh: any; export type Mesh<A = any, B = any> = any
  export const Vector2: any; export type Vector2 = any
  export const Vector4: any; export type Vector4 = any
  export const Color: any; export type Color = any
  export const HalfFloatType: any
  export const LinearFilter: any
  export const AdditiveBlending: any
}
declare module 'three/tsl'
