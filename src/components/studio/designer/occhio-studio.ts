/**
 * L'occhio nello Studio, lato browser: le miniature delle proposte in una sola
 * griglia numerata (JPEG, lato lungo ~1500 px) da mandare a /api/design/occhio,
 * e il riordino delle proposte secondo la classifica che torna.
 */

const carica = (src: string) => new Promise<HTMLImageElement>((ok, ko) => {
  const im = new Image()
  im.onload = () => ok(im)
  im.onerror = () => ko(new Error('miniatura non caricata'))
  im.src = src
})

/** Griglia numerata 1…n delle miniature (data URL), 4 colonne. */
export async function grigliaNumerata(miniature: string[], o: { cella?: number; colonne?: number } = {}): Promise<string> {
  const imgs = await Promise.all(miniature.map(carica))
  const cols = Math.min(o.colonne ?? 4, imgs.length)
  const rows = Math.ceil(imgs.length / cols)
  const cw = o.cella ?? 360
  const ratio = imgs[0].naturalHeight / imgs[0].naturalWidth
  const ch = Math.round(cw * ratio)
  const gap = 12
  const cv = document.createElement('canvas')
  cv.width = cols * cw + (cols + 1) * gap
  cv.height = rows * ch + (rows + 1) * gap
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, cv.width, cv.height)
  imgs.forEach((im, i) => {
    const x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (ch + gap)
    ctx.drawImage(im, x, y, cw, ch)
    // il numero in un riquadro bianco, sempre leggibile sopra qualunque tavola
    const s = Math.round(cw * 0.11)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x, y, s * 1.5, s * 1.25)
    ctx.fillStyle = '#000000'
    ctx.font = `bold ${s}px sans-serif`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(String(i + 1), x + s * 0.75, y + s * 0.66)
  })
  return cv.toDataURL('image/jpeg', 0.82)
}

/**
 * Il nuovo ordine delle proposte (indici da 0): prima quelle consegnabili in
 * classifica, in fondo quelle segnalate, che restano visibili con il segno.
 * `ordine` e `scarta` sono i numeri della griglia (da 1).
 */
export function ordineOcchio(n: number, ordine: number[], scarta: number[]): { pos: number[]; segnalate: Set<number> } {
  const via = new Set(scarta.filter(x => x >= 1 && x <= n).map(x => x - 1))
  const lista = [...new Set(ordine.filter(x => Number.isInteger(x) && x >= 1 && x <= n).map(x => x - 1))]
  for (let i = 0; i < n; i++) if (!lista.includes(i)) lista.push(i)
  return { pos: [...lista.filter(i => !via.has(i)), ...lista.filter(i => via.has(i))], segnalate: via }
}
