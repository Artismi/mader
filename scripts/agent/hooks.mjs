// Risolve gli alias "@/..." e le importazioni TypeScript senza estensione (solo per i test).
import { pathToFileURL, fileURLToPath } from 'node:url'
import fs from 'node:fs'
const SRC = fileURLToPath(new URL("../../src", import.meta.url))
const isFile = p => { try { return fs.statSync(p).isFile() } catch { return false } }
export async function resolve(spec, ctx, next) {
  let url = null
  if (spec.startsWith('@/')) url = pathToFileURL(SRC + '/' + spec.slice(2)).href
  else if (spec.startsWith('.') && ctx.parentURL?.startsWith('file:')) url = new URL(spec, ctx.parentURL).href
  if (url) {
    const p = fileURLToPath(url)
    for (const ext of ['', '.ts', '.tsx', '/index.ts']) if (isFile(p + ext)) return next(pathToFileURL(p + ext).href, ctx)
  }
  return next(spec, ctx)
}
