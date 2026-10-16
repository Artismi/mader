/**
 * Pezzi comuni degli script del catalogo: percorsi, cache, scaricamenti,
 * elenco di Google Fonts con la licenza presa dal repo google/fonts.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'

export const here = path.dirname(fileURLToPath(import.meta.url))
export const repo = path.resolve(here, '../..')
export const require = createRequire(import.meta.url)
export const CATALOGO = path.join(repo, 'src/components/studio/designer/asset')
/** cache locale fuori da git, servita dall'app come /asset-cache/… */
export const CACHE = path.join(repo, 'public/asset-cache')
/** scaricamenti grezzi (zip, metadati), non serviti */
export const GREZZI = path.join(repo, '.asset-cache')

export const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export const chiave = s => s.toLowerCase().replace(/[^a-z0-9]/g, '')

export const leggiJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d)
export const scriviJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n') }

/** Scarica con cache su disco (i metadati non si richiedono due volte). */
export async function scarica(url, file, { testo = false, headers = {}, curl = false } = {}) {
  if (file && fs.existsSync(file) && fs.statSync(file).size > 0) return testo ? fs.readFileSync(file, 'utf8') : fs.readFileSync(file)
  // GitLab risponde 406 al fetch di Node (intestazioni di undici): lì si passa da curl
  if (curl) {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    await new Promise((ok, ko) => execFile('curl', ['-sfL', '--retry', '3', '--retry-delay', '10', '-o', file, url], e => (e ? ko(new Error(`curl ${url}`)) : ok())))
    return testo ? fs.readFileSync(file, 'utf8') : fs.readFileSync(file)
  }
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers, signal: AbortSignal.timeout(240000) })
      if (!r.ok) throw new Error(`${r.status} ${url}`)
      const b = Buffer.from(await r.arrayBuffer())
      if (file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, b) }
      return testo ? b.toString('utf8') : b
    } catch (e) { if (i === 3 || /^40[46] /.test(e.message)) throw e; await new Promise(r => setTimeout(r, (/^429 /.test(e.message) ? 15000 : 1500) * (i + 1))) }
  }
}

/** Catalogo di Google Fonts (metadati pubblici) con la licenza di ogni famiglia. */
export async function googleFonts() {
  const meta = JSON.parse((await scarica('https://fonts.google.com/metadata/fonts', path.join(GREZZI, 'google/metadata.json'), { testo: true })).replace(/^\)\]\}'/, ''))
  const radice = JSON.parse(await scarica('https://api.github.com/repos/google/fonts/git/trees/main', path.join(GREZZI, 'google/tree-main.json'), { testo: true }))
  const licenze = new Map()
  for (const [dir, lic] of [['ofl', 'OFL-1.1'], ['apache', 'Apache-2.0'], ['ufl', 'UFL-1.0']]) {
    const sha = radice.tree.find(t => t.path === dir)?.sha
    if (!sha) continue
    const t = JSON.parse(await scarica(`https://api.github.com/repos/google/fonts/git/trees/${sha}`, path.join(GREZZI, `google/tree-${dir}.json`), { testo: true }))
    for (const x of t.tree) if (x.type === 'tree') licenze.set(chiave(x.path), lic)
  }
  // alcune famiglie stanno in una cartella comune (Big Shoulders Display → bigshoulders): vale il prefisso più lungo
  const chiavi = [...licenze.keys()].sort((a, b) => b.length - a.length)
  const lic = k => licenze.get(k) ?? licenze.get(chiavi.find(c => c.length >= 5 && k.startsWith(c))) ?? 'sconosciuta'
  const l = meta.familyMetadataList.map(f => ({ ...f, licenza: lic(chiave(f.family)) }))
  l.licenza = family => lic(chiave(family))
  return l
}

/** Importa un modulo TypeScript del repo (bundle con esbuild). */
export async function importaTs(entry) {
  const esbuild = createRequire(path.join(repo, 'scripts/designer/package.json'))('esbuild')
  const r = await esbuild.build({ entryPoints: [path.join(repo, entry)], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error', alias: { '@': path.join(repo, 'src') }, loader: { '.json': 'json' } })
  const f = path.join(GREZZI, `mod-${slug(entry)}.mjs`)
  fs.mkdirSync(GREZZI, { recursive: true })
  fs.writeFileSync(f, r.outputFiles[0].text)
  return import(pathToFileURL(f).href + '?' + Date.now())
}
