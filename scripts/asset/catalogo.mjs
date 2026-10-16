#!/usr/bin/env node
/**
 * AS1: porta nel catalogo quello che c'è già, per non perdere niente.
 * - i caratteri del motore (core/caratteri.ts), con la licenza dal repo google/fonts;
 * - i caratteri locali di public/fonts (Velvetyne, OFL; i pack senza licenza restano fuori dalle tavole);
 * - gli asset di public/assets, con licenza (dal LICENZA.txt della cartella), tag dal percorso e colori dominanti.
 *
 *   npm run asset:catalogo
 */
import fs from 'node:fs'
import path from 'node:path'
import { repo, CATALOGO, require, slug, leggiJson, scriviJson, googleFonts, importaTs } from './comune.mjs'

const fileCar = path.join(CATALOGO, 'caratteri.json'), fileAltri = path.join(CATALOGO, 'altri.json')
const catalogo = new Map(leggiJson(fileCar, []).map(a => [a.id, a]))
const metti = a => catalogo.set(a.id, { ...catalogo.get(a.id), ...a, carattere: { ...catalogo.get(a.id)?.carattere, ...a.carattere } })

/* ── caratteri del motore ─────────────────────────────────────────────── */
const gf = await googleFonts(), google = new Map(gf.map(f => [f.family, f]))
const { CARATTERI } = await importaTs('src/components/studio/designer/core/caratteri.ts')
for (const c of CARATTERI) {
  const g = google.get(c.family)
  metti({
    id: `carattere:${slug(c.family)}`, tipo: 'carattere', nome: c.family, fonte: 'google', url: `https://fonts.google.com/specimen/${c.family.replace(/ /g, '+')}`,
    autore: g?.designers?.join(', '), licenza: g?.licenza ?? gf.licenza(c.family),
    tag: { genere: [g?.category ?? (c.sans ? 'Sans Serif' : 'Serif')], umore: Object.entries(c.p).filter(([, v]) => v >= 0.5).map(([k]) => k) },
    carattere: { ruoli: c.ruoli, p: c.p, osa: c.p.sperimentale ?? 0, maiuscolo: c.maiuscolo, google: true, pesi: c.pesi, corsivo: !!c.corsivo, sans: c.sans, mono: !!c.mono, curato: true },
  })
}

/* ── caratteri locali (public/fonts) ──────────────────────────────────── */
const { LOCAL_FONTS } = await importaTs('src/components/studio/libraries/font-local.ts')
const licenzaCartella = dir => {
  for (const f of ['LICENSE.txt', 'LICENSE', 'OFL.txt', 'LICENZA.txt']) {
    const p = path.join(dir, f)
    if (fs.existsSync(p)) {
      const t = fs.readFileSync(p, 'utf8')
      if (/Open Font License/i.test(t)) return 'OFL-1.1'
      if (/CC0|Creative Commons CC0/i.test(t)) return 'CC0-1.0'
      if (/Apache License/i.test(t)) return 'Apache-2.0'
    }
  }
  return 'sconosciuta'
}
const OSA = { avanguardia: 0.95, display: 0.8, gotici: 0.9, pixel: 0.9, stencil: 0.85, calligrafici: 0.8, mono: 0.5, grotesk: 0.4, editoriali: 0.5 }
for (const f of LOCAL_FONTS) {
  const dir = path.join(repo, 'public', path.dirname(f.files[0].url))
  metti({
    id: `carattere:${slug(f.family)}`, tipo: 'carattere', nome: f.family, fonte: 'velvetyne', url: 'https://velvetyne.fr', licenza: licenzaCartella(dir),
    tag: { genere: [f.cat] }, file: f.files.map(x => ({ url: x.url, peso: x.weight, stile: x.style })),
    carattere: { ruoli: f.cat === 'mono' ? ['etichetta'] : ['titolo'], p: { sperimentale: OSA[f.cat] ?? 0.6 }, osa: OSA[f.cat] ?? 0.6, pesi: f.weights },
  })
}
for (const file of fs.readdirSync(path.join(repo, 'public/fonts/pack')).filter(f => /\.(otf|ttf|woff2?)$/.test(f))) {
  const nome = file.replace(/\.\w+$/, '')
  metti({ id: `carattere:${slug(nome)}`, tipo: 'carattere', nome, fonte: 'pack', licenza: licenzaCartella(path.join(repo, 'public/fonts/pack')), tag: {}, file: [{ url: `/fonts/pack/${file}`, peso: 400 }], carattere: { ruoli: ['titolo'], p: { sperimentale: 0.7 }, osa: 0.7 } })
}

/* ── asset di public/assets ───────────────────────────────────────────── */
const sharp = require('sharp')
const TIPO = { elements: 'elemento', textures: 'texture', materials: 'materiale', overlays: 'sovrapposizione', compose: 'elemento' }
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
async function colori(file) {
  if (file.endsWith('.svg')) return [...new Set((fs.readFileSync(file, 'utf8').match(/#[0-9a-fA-F]{6}\b/g) ?? []).map(c => c.toLowerCase()))].slice(0, 4)
  // tre colori: quantizzo una miniatura 16×16 e prendo i più frequenti
  const { data, info } = await sharp(file).resize(16, 16, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const n = new Map()
  for (let i = 0; i < data.length; i += info.channels) {
    const k = [data[i], data[i + 1], data[i + 2]].map(v => Math.min(7, v >> 5)).join()
    const e = n.get(k) ?? { c: 0, r: 0, g: 0, b: 0 }
    n.set(k, { c: e.c + 1, r: e.r + data[i], g: e.g + data[i + 1], b: e.b + data[i + 2] })
  }
  return [...n.values()].sort((a, b) => b.c - a.c).slice(0, 3).map(e => hex(e.r / e.c, e.g / e.c, e.b / e.c))
}
const licenzaSu = dir => { for (let d = dir; d.startsWith(path.join(repo, 'public')); d = path.dirname(d)) { const l = licenzaCartella(d); if (l !== 'sconosciuta') return l } return 'sconosciuta' }
const altri = []
const giro = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? giro(path.join(d, e.name)) : [path.join(d, e.name)]))
for (const file of giro(path.join(repo, 'public/assets')).filter(f => /\.(png|jpe?g|svg)$/i.test(f))) {
  const rel = path.relative(path.join(repo, 'public'), file).split(path.sep)
  const parole = rel.slice(1).join(' ').replace(/\.\w+$/, '').split(/[^a-zA-Z0-9àèéìòù]+/).filter(w => w.length > 2 && !/^\d+$/.test(w)).map(w => w.toLowerCase())
  let col = []
  try { col = await colori(file) } catch { /* file illeggibile: niente colori */ }
  altri.push({
    id: `${TIPO[rel[1]] ?? 'elemento'}:${slug(rel.slice(1).join('-').replace(/\.\w+$/, ''))}`, tipo: TIPO[rel[1]] ?? 'elemento', nome: rel[rel.length - 1],
    fonte: rel[2]?.startsWith('ds-') ? 'pack' : 'public', licenza: licenzaSu(path.dirname(file)),
    tag: { soggetto: [...new Set(parole)] }, colori: col, file: [{ url: '/' + rel.join('/') }],
  })
}

scriviJson(fileCar, [...catalogo.values()].sort((a, b) => a.id.localeCompare(b.id)))
scriviJson(fileAltri, altri.sort((a, b) => a.id.localeCompare(b.id)))
const conta = l => Object.entries(l.reduce((n, a) => ({ ...n, [a.licenza]: (n[a.licenza] ?? 0) + 1 }), {})).map(([k, v]) => `${k} ${v}`).join(', ')
console.log(`caratteri: ${catalogo.size} (${conta([...catalogo.values()])}) · altri asset: ${altri.length} (${conta(altri)})`)
