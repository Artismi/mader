/**
 * Misure di un carattere lette dal file con opentype.js, e da quelle genere,
 * epoca, personalità e ruoli. Tutto in frazioni dell'em, senza rasterizzare:
 * si contano gli incroci di una retta con i contorni dei glifi.
 */
import { require } from './comune.mjs'
const opentype = require('opentype.js')

export const ACCENTI_IT = 'àèéìíòóùúÀÈÉÌÒÙ’«»'

/** Contorni di un glifo come poligoni (curve campionate), in unità del font, y in su. */
function contorni(glyph) {
  const out = []
  let cur = [], x = 0, y = 0
  for (const c of glyph.path.commands) {
    if (c.type === 'M') { if (cur.length) out.push(cur); cur = [[c.x, c.y]] }
    else if (c.type === 'L') cur.push([c.x, c.y])
    else if (c.type === 'Q') for (let t = 0.125; t <= 1; t += 0.125) { const u = 1 - t; cur.push([u * u * x + 2 * u * t * c.x1 + t * t * c.x, u * u * y + 2 * u * t * c.y1 + t * t * c.y]) }
    else if (c.type === 'C') for (let t = 0.125; t <= 1; t += 0.125) { const u = 1 - t; cur.push([u ** 3 * x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t ** 3 * c.x, u ** 3 * y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t ** 3 * c.y]) }
    else if (c.type === 'Z') { if (cur.length) out.push(cur); cur = [] }
    if (c.x !== undefined) { x = c.x; y = c.y }
  }
  if (cur.length) out.push(cur)
  return out
}

/** Incroci con la retta orizzontale y=v (asse 1) o verticale x=v (asse 0), ordinati. */
function incroci(cs, v, asse) {
  const o = 1 - asse, xs = []
  for (const c of cs) for (let i = 0; i < c.length; i++) {
    const a = c[i], b = c[(i + 1) % c.length]
    if ((a[asse] <= v && b[asse] > v) || (b[asse] <= v && a[asse] > v)) xs.push(a[o] + (v - a[asse]) / (b[asse] - a[asse]) * (b[o] - a[o]))
  }
  return xs.sort((p, q) => p - q)
}

const media = l => l.reduce((a, b) => a + b, 0) / (l.length || 1)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

/** Misure di un file (buffer TTF/OTF/WOFF). */
export function misura(buf) {
  const f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const upm = f.unitsPerEm, os2 = f.tables.os2 ?? {}
  const g = ch => { const i = f.charToGlyphIndex(ch); return i > 0 ? f.glyphs.get(i) : null }
  const bbox = ch => g(ch)?.getBoundingBox()
  const capH = os2.sCapHeight > 0 ? os2.sCapHeight : (bbox('H')?.y2 ?? upm * 0.7)
  const xH = os2.sxHeight > 0 ? os2.sxHeight : (bbox('x')?.y2 ?? upm * 0.5)
  const minuscole = [...'abcdefghijklmnopqrstuvwxyz'].map(g).filter(Boolean)
  const larghezze = minuscole.map(x => x.advanceWidth)
  // la o: rotondità, contrasto (tratto verticale contro orizzontale), stencil (aperta sopra o di lato)
  let contrasto = 0, tondo = 1, stencil = false
  const o = g('o')
  if (o) {
    const cs = contorni(o), b = o.getBoundingBox(), cy = (b.y1 + b.y2) / 2, cx = (b.x1 + b.x2) / 2
    tondo = (b.x2 - b.x1) / Math.max(1, b.y2 - b.y1)
    const h = incroci(cs, cy, 1), v = incroci(cs, cx, 0)
    if (h.length === 4 && v.length === 4) {
      const spesso = media([h[1] - h[0], h[3] - h[2]]), sottile = media([v[1] - v[0], v[3] - v[2]])
      contrasto = clamp(1 - Math.min(spesso, sottile) / Math.max(spesso, sottile))
    }
    stencil = (h.length >= 4 && v.length === 0) || (v.length >= 4 && h.length === 0)
  }
  // grazie: la I alla base è molto più larga che a metà
  let grazie = false, spessore = 0
  const I = g('I') ?? g('l')
  if (I) {
    // più quote vicino alla base e alla cima: i filetti delle didone sono sottilissimi
    const cs = contorni(I), mid = incroci(cs, capH * 0.5, 1), top = I.getBoundingBox().y2
    if (mid.length >= 2) {
      spessore = (mid[1] - mid[0]) / upm
      const quote = [0.004, 0.01, 0.02, 0.03].flatMap(q => [capH * q, top - capH * q])
      grazie = quote.some(y => { const x = incroci(cs, y, 1); return x.length >= 2 && (x[x.length - 1] - x[0]) / (mid[1] - mid[0]) > 1.45 })
    }
  }
  const fvar = f.tables.fvar
  return {
    peso: os2.usWeightClass ?? 400,
    corsivo: !!(os2.fsSelection & 1) || (f.tables.post?.italicAngle ?? 0) !== 0,
    larghezza: +(media(larghezze) / upm).toFixed(3),
    altezzaX: +(xH / capH).toFixed(3),
    contrasto: +contrasto.toFixed(3),
    grazie,
    tondo: +tondo.toFixed(3),
    spessore: +spessore.toFixed(3),
    mono: !!f.tables.post?.isFixedPitch || (larghezze.length > 20 && new Set(larghezze).size === 1),
    stencil,
    assi: fvar ? fvar.axes.map(a => a.tag) : [],
    italiano: [...ACCENTI_IT].every(ch => f.charToGlyphIndex(ch) > 0),
    famiglia: f.names.typoFamilyName?.en ?? f.names.preferredFamily?.en ?? f.names.fontFamily?.en ?? '',
    sottofamiglia: f.names.typoSubfamilyName?.en ?? f.names.fontSubfamily?.en ?? '',
  }
}

const OSA_FONTE = { velvetyne: 0.9, collletttivo: 0.7, womxn: 0.8, league: 0.4 }

/**
 * Dal file alle voci del catalogo: genere, epoca, personalità, ruoli, quanto osa.
 * `cat` è la categoria di Google (Serif, Sans Serif, Display, Handwriting, Monospace) se c'è.
 */
export function classifica(m, { nome, fonte, cat, pesi, slab }) {
  const display = cat === 'Display' || (fonte !== 'google' && fonte !== 'league')
  const genere = m.mono ? 'monospaziato' : m.stencil || /stencil/i.test(nome) ? 'stencil' : cat === 'Handwriting' ? 'script'
    : m.grazie ? (m.contrasto >= 0.65 ? 'didone' : slab || m.contrasto < 0.15 ? 'slab' : 'garalde')
    : display && (m.contrasto > 0.45 || m.larghezza > 0.7 || m.larghezza < 0.36) ? 'display'
    : m.tondo >= 0.96 ? 'geometrico' : m.contrasto >= 0.28 ? 'umanista' : m.altezzaX >= 0.72 ? 'neo-grotesco' : 'grotesco'
  const struttura = m.grazie ? 'graziato' : 'bastone'
  const epoca = { didone: 'ottocento', slab: 'ottocento', garalde: 'rinascimentale', grotesco: 'primo-novecento', 'neo-grotesco': 'modernista', geometrico: 'modernista', monospaziato: 'modernista' }[genere] ?? 'contemporaneo'
  const maxPeso = Math.max(...pesi), stretto = m.larghezza < 0.45, morbidoNome = /round|soft|bubble|baloo|fredoka|nunito|comfortaa|varela/i.test(nome)
  let osa = OSA_FONTE[fonte] ?? ({ Display: 0.6, Handwriting: 0.55 }[cat] ?? 0.1)
  if (genere === 'stencil') osa = Math.max(osa, 0.85)
  if (m.contrasto > 0.8 || m.larghezza > 0.72 || m.larghezza < 0.34) osa = Math.min(1, osa + 0.2)
  if (m.assi.some(a => !['wght', 'ital', 'opsz', 'wdth', 'slnt'].includes(a))) osa = Math.min(1, osa + 0.1)
  const p = Object.fromEntries(Object.entries({
    forte: clamp((maxPeso - 500) / 400 * 0.6 + (stretto && genere !== 'script' ? 0.3 : 0) + m.spessore * 2),
    elegante: clamp(m.contrasto * 0.8 + (m.grazie ? 0.2 : 0) + (genere === 'didone' ? 0.2 : 0) - (maxPeso >= 900 && !m.grazie ? 0.2 : 0)),
    tecnico: { monospaziato: 0.9, 'neo-grotesco': 0.6, geometrico: 0.45, grotesco: 0.4, stencil: 0.5 }[genere] ?? 0.1,
    caldo: { garalde: 0.6, umanista: 0.5, script: 0.7, slab: 0.45 }[genere] ?? 0.15,
    giocoso: clamp((genere === 'script' ? 0.5 : 0) + (morbidoNome ? 0.4 : 0) + (display && m.tondo > 1.02 ? 0.3 : 0)),
    morbido: clamp((morbidoNome ? 0.7 : 0) + (m.tondo > 1.05 ? 0.3 : 0)),
    sperimentale: osa,
  }).map(([k, v]) => [k, +v.toFixed(2)]).filter(([, v]) => v >= 0.05))
  const testo = !display && !['script', 'stencil', 'display'].includes(genere) && pesi.includes(400) && m.contrasto < 0.7 && m.altezzaX >= 0.6 && m.larghezza > 0.4 && m.larghezza < 0.66 && osa < 0.5
  const ruoli = ['titolo', ...(testo ? ['testo'] : []), ...((testo && !m.grazie && maxPeso >= 600) || m.mono ? ['etichetta'] : [])]
  return {
    genere, struttura, epoca, p, osa: +osa.toFixed(2), ruoli,
    sans: !m.grazie, mono: m.mono, maiuscolo: (!m.grazie && (maxPeso >= 700 || stretto)) || genere === 'display' || genere === 'stencil',
    umore: Object.entries(p).filter(([, v]) => v >= 0.5).map(([k]) => k),
  }
}
