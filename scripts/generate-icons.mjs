// Genera la libreria icone dello Studio da una selezione curata di Lucide (licenza ISC).
// Ogni icona diventa un unico path (viewBox 24, a tratto) nel formato di ICONS_LIBRARY.
// Selezione e categorie: scripts/data/icon-selection.json
// Uso: npm i --no-save lucide@0.577.0 && node scripts/generate-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const { icons } = createRequire(import.meta.url)('lucide')

const n = v => String(+(+v).toFixed(3))
const pts = s => s.trim().split(/[\s,]+/).map(Number).reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(v) : a.push([v]), a), [])
// Un path che inizia con "m" minuscola ha il primo punto assoluto, ma una volta unito
// ad altri path diventerebbe relativo al punto precedente: lo rendo esplicitamente
// assoluto ("M x y") e trasformo le coppie implicite successive in "l" relative.
function absStart(d) {
  d = d.trim()
  if (d[0] !== 'm') return d
  const num = /-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/gy
  let i = 1; const take = () => { while (/[\s,]/.test(d[i])) i++; num.lastIndex = i; const m = num.exec(d); i = num.lastIndex; return m[0] }
  const x = take(), y = take()
  while (/[\s,]/.test(d[i])) i++
  const rest = d.slice(i)
  return `M${x} ${y}` + (rest && /[-.\d]/.test(rest[0]) ? 'l' + rest : rest)
}
// Converte un elemento SVG di Lucide in comandi path equivalenti.
function toD([tag, a]) {
  switch (tag) {
    case 'path': return absStart(a.d)
    case 'line': return `M${n(a.x1)} ${n(a.y1)}L${n(a.x2)} ${n(a.y2)}`
    case 'polyline': case 'polygon': { const p = pts(a.points); return 'M' + p.map(([x, y]) => `${n(x)} ${n(y)}`).join('L') + (tag === 'polygon' ? 'Z' : '') }
    case 'circle': case 'ellipse': {
      const rx = +(a.rx ?? a.r), ry = +(a.ry ?? a.r), cx = +a.cx, cy = +a.cy
      return `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`
    }
    case 'rect': {
      const x = +(a.x ?? 0), y = +(a.y ?? 0), w = +a.width, h = +a.height, r = Math.min(+(a.rx ?? a.ry ?? 0), w / 2, h / 2)
      if (!r) return `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`
      return `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}h${n(-(w - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}v${n(-(h - 2 * r))}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}Z`
    }
    default: throw new Error(`elemento non gestito: ${tag}`)
  }
}
const label = k => k.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/([0-9])([A-Z])/g, '$1 $2')

const sel = JSON.parse(readFileSync(new URL('./data/icon-selection.json', import.meta.url)))
const cats = Object.fromEntries(Object.entries(sel).map(([cat, names]) => [cat, [...new Set(names)].map(k => {
  if (!icons[k]) throw new Error(`icona inesistente: ${k}`)
  return { name: label(k), path: icons[k].map(toD).join(' ') }
})]))
const total = Object.values(cats).reduce((a, l) => a + l.length, 0)
writeFileSync('src/components/studio/libraries/icon-library.ts', `// AUTO-GENERATO da scripts/generate-icons.mjs — non modificare a mano.
// Icone da Lucide (https://lucide.dev), licenza ISC. Path a tratto, viewBox 24.

export const ICON_CATEGORIES: Record<string, { name: string; path: string }[]> = {
${Object.entries(cats).map(([c, l]) => `  ${JSON.stringify(c)}: [\n${l.map(i => `    { name: ${JSON.stringify(i.name)}, path: ${JSON.stringify(i.path)} },`).join('\n')}\n  ],`).join('\n')}
}
`)
console.log(`${total} icone in ${Object.keys(cats).length} categorie`)
