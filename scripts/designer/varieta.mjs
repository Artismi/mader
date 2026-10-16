/** Misure della varietà delle palette nelle prime 12 proposte (vetrina). */

/** #rrggbb → [L, C, h] in OKLCH. */
const lch = hex => {
  const v = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const l = Math.cbrt(0.4122214708 * v[0] + 0.5363325363 * v[1] + 0.0514459929 * v[2]), m = Math.cbrt(0.2119034982 * v[0] + 0.6806995451 * v[1] + 0.1073969566 * v[2]), s = Math.cbrt(0.0883024619 * v[0] + 0.2817188376 * v[1] + 0.6299787005 * v[2])
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, b = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(a, b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360]
}

/** Famiglia di una palette "bg|ink|accent": tono del fondo e tinte (a 12 settori) di fondo e accento; i grigi contano come neutri. */
export function famiglia(p) {
  const [bg, , acc] = p.split('|'), tinta = ([, C, h]) => (C < 0.04 ? 'n' : Math.floor(h / 30))
  const B = lch(bg)
  return `${B[0] > 0.75 ? 'chiaro' : B[0] < 0.35 ? 'scuro' : 'medio'}-${tinta(B)}-${acc ? tinta(lch(acc)) : ''}`
}

/** Distanza media (OKLab, fondo e accento) tra le palette: 0 = tutte uguali. */
export function distanzaPalette(ps) {
  const lab = hex => { const [L, C, h] = lch(hex); return [L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)] }
  const d = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
  const v = ps.map(p => p.split('|')).map(([bg, , acc]) => [lab(bg), lab(acc ?? bg)])
  let t = 0, n = 0
  for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) { t += (d(v[i][0], v[j][0]) + d(v[i][1], v[j][1])) / 2; n++ }
  return n ? t / n : 0
}

/** Quante palette hanno il fondo chiaro e neutro (la palette "di sempre"). */
export const neutriChiari = ps => ps.filter(p => famiglia(p).startsWith('chiaro-n')).length
