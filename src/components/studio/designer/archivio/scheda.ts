/**
 * G1: dalla scena (decompilata da D1 o del motore) alla scheda dell'archivio:
 * programma in frazioni e ruoli, griglia, tipografia, palette, tag e impronta.
 * Funzioni pure: girano nella pagina del banco, nei test e nella vetrina.
 */
import type { Scene, SceneEl } from '../types'
import type { Esempio, Licenza, Programma, Strato } from './tipi'
import { COLORI } from './tipi'

type Testo = Extract<SceneEl, { kind: 'text' }>
const r3 = (v: number) => Math.round(v * 1000) / 1000

/* ── colore ─────────────────────────────────────────────────────────────── */
const rgb = (c: string): [number, number, number] => {
  const m = c.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (m) { const h = m[1].length === 3 ? m[1].split('').map(x => x + x).join('') : m[1]; const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
  const r = c.match(/rgba?\(([^)]+)\)/)
  if (r) { const [a, b, d] = r[1].split(',').map(Number); return [a, b, d] }
  return [128, 128, 128]
}
const dist = (a: string, b: string) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / 441 }
export const luminanza = (c: string) => { const [r, g, b] = rgb(c).map(v => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const colDi = (e: SceneEl): string | undefined => {
  if (e.kind === 'text' || e.kind === 'arcText' || e.kind === 'glyph') return e.color
  if (e.kind === 'line') return e.color
  if ('fill' in e) return typeof e.fill === 'string' ? e.fill : e.fill?.from
  return undefined
}

/* ── geometria ──────────────────────────────────────────────────────────── */
export function boxEl(e: SceneEl): [number, number, number, number] | null {
  switch (e.kind) {
    case 'rect': case 'image': case 'ornament': return [e.x, e.y, e.w, e.h]
    case 'text': return [e.x, e.y, e.w, e.h]
    case 'circle': return [e.cx - e.r, e.cy - e.r, 2 * e.r, 2 * e.r]
    case 'line': return [Math.min(e.x1, e.x2), Math.min(e.y1, e.y2), Math.abs(e.x2 - e.x1) || e.width, Math.abs(e.y2 - e.y1) || e.width]
    case 'path': {
      const n = (e.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
      if (n.length < 4) return null
      const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
      const x = Math.min(...xs), y = Math.min(...ys)
      return [x, y, Math.max(...xs) - x, Math.max(...ys) - y]
    }
    default: return null
  }
}

const maiuscolo = (t: Testo) => { const s = t.lines.join(' '); return /\p{L}/u.test(s) && s === s.toUpperCase() }

/** Il ruolo di un testo dal nome del livello (D1 e motore usano nomi diversi). */
function ruoloTesto(t: Testo): Strato['ruolo'] | null {
  const n = t.name.toLowerCase()
  if (t.deco) return null
  if (/^titolo/.test(n)) return 'titolo'
  if (/^occhiello/.test(n)) return 'occhiello'
  if (/^(testo|corpo|paragrafo)/.test(n)) return 'testo'
  if (/^dettagl/.test(n)) return 'dettagli'
  if (/^(invito|cta)/.test(n)) return 'invito'
  if (/^(marchio|brand)/.test(n)) return 'marchio'
  if (/^numero/.test(n)) return 'numero'
  return null
}

/** Palette vera: fondo, inchiostro (il colore del testo più grande), accenti per area. */
function paletteDi(sc: Scene) {
  const fondoEl = sc.els.find(e => e.kind === 'rect' && e.w >= sc.w * 0.95 && e.h >= sc.h * 0.95)
  const fondo = (fondoEl && colDi(fondoEl)) || sc.bg
  const testi = sc.els.filter((e): e is Testo => e.kind === 'text' && !e.deco)
  const peso = new Map<string, number>()
  for (const t of testi) peso.set(t.color, (peso.get(t.color) ?? 0) + t.size * t.lines.join('').length)
  const inchiostro = [...peso.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? (luminanza(fondo) > 0.5 ? '#111111' : '#ffffff')
  const aree = new Map<string, number>()
  for (const e of sc.els) {
    const c = colDi(e), b = boxEl(e)
    if (!c || !b || e === fondoEl || /grana|carta|velo/i.test(e.name)) continue
    if (dist(c, fondo) < 0.1 || dist(c, inchiostro) < 0.1) continue
    const k = [...aree.keys()].find(x => dist(x, c) < 0.1) ?? c
    aree.set(k, (aree.get(k) ?? 0) + Math.max(1, b[2] * b[3]))
  }
  const accenti = [...aree.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 3)
  return { fondo, inchiostro, accenti, scuro: luminanza(fondo) < 0.35 }
}

/** Ruolo di colore: il più vicino tra fondo, inchiostro, accenti; i grigi intermedi sono "tenue". */
function ruoloColore(c: string | undefined, p: ReturnType<typeof paletteDi>): Strato['colore'] {
  if (!c) return undefined
  const cand: [typeof COLORI[number], string][] = [['fondo', p.fondo], ['inchiostro', p.inchiostro]]
  if (p.accenti[0]) cand.push(['accento', p.accenti[0]])
  if (p.accenti[1]) cand.push(['accento2', p.accenti[1]])
  const [best, d] = cand.map(([k, v]) => [k, dist(c, v)] as const).sort((a, b) => a[1] - b[1])[0]
  if (d > 0.25) {
    const [r, g, b] = rgb(c), sat = Math.max(r, g, b) - Math.min(r, g, b)
    return sat < 40 ? 'tenue' : p.accenti[0] ? 'accento2' : 'accento'
  }
  return best
}

/** Programma dalla scena: strati in frazioni, ordinati dal fondo ai testi. */
export function programmaDa(sc: Scene): Programma {
  const W = sc.w, H = sc.h, area = W * H
  const p = paletteDi(sc)
  const strati: Strato[] = []
  const testi = sc.els.filter((e): e is Testo => e.kind === 'text' && !e.deco)
  const maxSize = Math.max(1, ...testi.map(t => t.size))
  const box = (b: [number, number, number, number]): Strato['box'] => [r3(b[0] / W), r3(b[1] / H), r3(b[2] / W), r3(b[3] / H)]
  for (const e of sc.els) {
    const b = boxEl(e)
    if (!b || /grana|carta|velo|finitura|ombra/i.test(e.name)) continue
    const a = b[2] * b[3]
    if (e.kind === 'rect' && b[2] >= W * 0.95 && b[3] >= H * 0.95) { strati.push({ ruolo: 'fondo', box: [0, 0, 1, 1], colore: ruoloColore(colDi(e), p) }); continue }
    if (e.kind === 'image') { if (a > area * 0.02) strati.push({ ruolo: 'foto', box: box(b), ...(e.shape && e.shape !== 'rect' ? { forma: e.shape } : {}) }); continue }
    if (e.kind === 'rect' || e.kind === 'path') { if (a > area * 0.004) strati.push({ ruolo: 'campo', box: box(b), colore: ruoloColore(colDi(e), p), ...(e.kind === 'rect' && e.angle ? { angolo: Math.round(e.angle) } : {}), ...('opacity' in e && e.opacity !== undefined && e.opacity < 1 ? { opacita: r3(e.opacity) } : {}) }); continue }
    if (e.kind === 'circle') { if (a > area * 0.002) strati.push({ ruolo: 'disco', box: box(b), colore: ruoloColore(colDi(e), p) }); continue }
    if (e.kind === 'line') { strati.push({ ruolo: 'filetto', box: box(b), colore: ruoloColore(colDi(e), p) }); continue }
    if (e.kind === 'text') {
      const ruolo = ruoloTesto(e) ?? (e.size >= maxSize * 0.8 ? 'titolo' : 'dettagli')
      if (e.deco) continue
      const grande = ruolo === 'titolo' || ruolo === 'numero'
      const famiglia = grande ? (e.font.weight >= 800 ? 'impatto' : 'display') : ruolo === 'testo' ? 'testo' : maiuscolo(e) ? 'etichetta' : 'testo'
      strati.push({
        ruolo, box: box(b), colore: ruoloColore(e.color, p), famiglia, corpo: r3(e.size / H),
        allinea: e.align, ...(maiuscolo(e) ? { maiuscolo: true } : {}), ...(e.font.italic ? { corsivo: true } : {}), ...(e.angle ? { angolo: Math.round(e.angle) } : {}),
      })
    }
  }
  if (!strati.some(s => s.ruolo === 'fondo')) strati.unshift({ ruolo: 'fondo', box: [0, 0, 1, 1], colore: 'fondo' })
  return { rapporto: r3(W / H), strati: strati.slice(0, 40) }
}

/* ── descrittori ────────────────────────────────────────────────────────── */
const TESTI = new Set(['titolo', 'occhiello', 'testo', 'dettagli', 'invito', 'marchio', 'numero'])
export const testiDi = (p: Programma) => p.strati.filter(s => TESTI.has(s.ruolo))

export function grigliaDi(p: Programma): Esempio['griglia'] {
  const s = p.strati.filter(x => x.ruolo !== 'fondo')
  const cl = (v: number) => r3(Math.max(0, Math.min(0.5, v)))
  const margini: [number, number, number, number] = s.length
    ? [cl(Math.min(...s.map(x => x.box[1]))), cl(1 - Math.max(...s.map(x => x.box[0] + x.box[2]))), cl(1 - Math.max(...s.map(x => x.box[1] + x.box[3]))), cl(Math.min(...s.map(x => x.box[0])))]
    : [0, 0, 0, 0]
  const t = testiDi(p)
  const bordi: number[] = []
  for (const x of t.map(x => x.box[0]).sort((a, b) => a - b)) if (!bordi.length || x - bordi[bordi.length - 1] > 0.06) bordi.push(x)
  const conta = { left: 0, center: 0, right: 0 }
  for (const x of t) conta[x.allinea ?? 'left'] += (x.corpo ?? 0.02) * 10 + 1
  const tot = conta.left + conta.center + conta.right
  const [dom, v] = Object.entries(conta).sort((a, b) => b[1] - a[1])[0]
  const asse = !tot || v / tot < 0.6 ? 'libero' : dom === 'left' ? 'sinistra' : dom === 'center' ? 'centro' : 'destra'
  return { margini, colonne: Math.max(1, Math.min(4, bordi.length)), asse }
}

export function tipografiaDi(p: Programma, famiglie: string[] = []): Esempio['tipografia'] {
  const t = testiDi(p)
  const corpi = t.map(x => x.corpo ?? 0.02)
  const tit = t.filter(x => x.ruolo === 'titolo' || x.ruolo === 'numero').map(x => x.corpo ?? 0)
  return {
    contrasto: r3(corpi.length ? Math.max(...corpi) / Math.max(0.005, Math.min(...corpi)) : 1),
    maiuscolo: r3(t.length ? t.filter(x => x.maiuscolo).length / t.length : 0),
    voci: [...new Set(t.map(x => x.famiglia ?? 'testo'))],
    famiglie: [...new Set(famiglie)],
    titolo: r3(tit.length ? Math.max(...tit) : 0),
  }
}

/** Impronta per la ricerca e per la distanza dagli archetipi: griglia 6×6 di testo e di immagine/forme, più tipografia e colore. */
export function impronta(p: Programma, scuro = false): number[] {
  const N = 6, txt = new Array(N * N).fill(0), img = new Array(N * N).fill(0)
  for (const s of p.strati) {
    if (s.ruolo === 'fondo') continue
    const dest = TESTI.has(s.ruolo) ? txt : img
    const [x, y, w, h] = s.box
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const cx0 = j / N, cy0 = i / N
      const ox = Math.max(0, Math.min(x + w, cx0 + 1 / N) - Math.max(x, cx0)), oy = Math.max(0, Math.min(y + h, cy0 + 1 / N) - Math.max(y, cy0))
      dest[i * N + j] = Math.min(1, dest[i * N + j] + ox * oy * N * N)
    }
  }
  const t = testiDi(p), tit = t.find(x => x.ruolo === 'titolo') ?? t[0]
  const g = grigliaDi(p), ty = tipografiaDi(p)
  return [
    ...txt, ...img.map(v => v * 0.6),
    tit ? tit.box[0] + tit.box[2] / 2 : 0.5, tit ? tit.box[1] + tit.box[3] / 2 : 0.5, Math.min(1, ty.titolo * 5),
    Math.min(1, Math.log(ty.contrasto) / 3), ty.maiuscolo, scuro ? 1 : 0, Math.min(1, t.length / 8),
    g.asse === 'sinistra' ? 1 : 0, g.asse === 'centro' ? 1 : 0, g.asse === 'destra' ? 1 : 0, g.asse === 'libero' ? 1 : 0,
  ].map(r3)
}

export const distanza = (a: number[], b: number[]) => { let s = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s / Math.max(1, Math.min(a.length, b.length))) }

/* ── tag ────────────────────────────────────────────────────────────────── */
const SETTORI: [string, RegExp][] = [
  ['cultura', /exhib|exposi|tentoonst|museum|mostra|galler|salon|kunst|art\b|arte\b/i],
  ['spettacolo', /theat|concert|opera|cinema|film|circus|circo|music|festival|cabaret|danc|ballet|schouwburg|concerto/i],
  ['editoria', /book|magazine|journal|chap-?book|revue|review|cover|tijdschrift|harper|century|lippincott|libro|rivista|edizion|poster calendar/i],
  ['viaggio', /travel|railw|cruise|steam|tour|reis|spoorweg|line\b|voyage|viaggi|riviera|ski/i],
  ['commercio', /soap|cocoa|bicycl|cycle|automob|company|sale|advert|cigar|tobac|lamp|sewing|insurance|prodott|negozio|saldi/i],
  ['cibo', /food|restaur|wine|coffee|caff|tea\b|koffie|cacao|chocol|beer|bier|menu|pranzo|cena|cucina/i],
  ['sport', /sport|olymp|race|football|palestra|allen|corsa|gara/i],
  ['civico', /war\b|army|navy|bond|loan|liberty|enlist|ships|industr|health|campaign|elect|verkiez|teamwork|conserv|salute|comune/i],
  ['moda', /fashion|mode\b|moda|couture/i],
]
export const settoriDi = (testo: string) => SETTORI.filter(([, re]) => re.test(testo)).map(([k]) => k)

export function tonoDi(p: Programma, pal: { scuro: boolean; accenti: string[] }): string[] {
  const ty = tipografiaDi(p), t = []
  if (ty.contrasto > 6) t.push('audace')
  if (ty.maiuscolo > 0.6) t.push('perentorio')
  if (pal.scuro) t.push('notturno')
  if (p.strati.length <= 5) t.push('essenziale')
  if (p.strati.length > 14) t.push('ricco')
  if (p.strati.some(s => s.angolo)) t.push('dinamico')
  if (pal.accenti.length >= 2) t.push('vivace')
  if (!t.length) t.push('sobrio')
  return t
}

/** Registro del motore più vicino: dall'epoca, dal settore e dalla forma (grezzo, dichiarato tale). */
export function registroDi(anno: number | undefined, settore: string[], p: Programma, pal: { scuro: boolean; accenti: string[] }): string {
  const g = grigliaDi(p), ty = tipografiaDi(p), dinamico = p.strati.some(s => s.angolo)
  if (settore.includes('editoria')) return 'editoriale'
  if (anno !== undefined && anno < 1915) return ty.maiuscolo > 0.5 ? 'retro' : 'artigianale'
  if (anno !== undefined && anno < 1946) return dinamico || ty.contrasto > 8 ? 'avanguardia' : 'retro'
  if (anno !== undefined && anno < 1980) return g.asse === 'sinistra' && !pal.scuro ? 'svizzero' : pal.accenti.length >= 2 ? 'pop' : 'editoriale'
  return pal.scuro ? 'notte' : 'editoriale'
}

/** La scheda completa di un design. */
export function scheda(sc: Scene, meta: { id: string; origine: Esempio['origine']; titolo?: string; autore?: string; anno?: number; testo?: string; settore?: string[]; fedelta: number; licenza: Licenza }): Esempio {
  const programma = programmaDa(sc)
  const pal = paletteDi(sc)
  const famiglie = sc.els.filter((e): e is Testo => e.kind === 'text' && !e.deco).map(e => e.font.family)
  const settore = meta.settore ?? settoriDi(`${meta.titolo ?? ''} ${meta.testo ?? ''}`)
  return {
    id: meta.id, origine: meta.origine, titolo: meta.titolo, autore: meta.autore, anno: meta.anno,
    epoca: meta.anno ? `${Math.floor(meta.anno / 10) * 10}s` : undefined,
    programma, griglia: grigliaDi(programma), tipografia: tipografiaDi(programma, famiglie),
    palette: pal, settore, tono: tonoDi(programma, pal), registro: registroDi(meta.anno, settore, programma, pal),
    impronta: impronta(programma, pal.scuro), fedelta: r3(meta.fedelta), licenza: meta.licenza,
  }
}
