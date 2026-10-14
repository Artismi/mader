// Copia in public/ i file binari serviti al browser: runtime ONNX e modello di scontorno.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
// fileURLToPath: su Windows il pathname dell'URL ("/C:/…") non è un percorso valido
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const copy = (from, to) => {
  const src = path.join(root, 'node_modules', from), dst = path.join(root, 'public', to)
  if (!fs.existsSync(src)) return console.warn('[vendor] manca', from)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) fs.copyFileSync(src, dst)
}
for (const f of ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'])
  copy(`onnxruntime-web/dist/${f}`, `vendor/ort/${f}`)
copy('@rmbg/model-u2netp/u2netp.onnx', 'models/u2netp.onnx')
console.log('[vendor] runtime e modelli pronti')
