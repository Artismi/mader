/**
 * Strumenti nuovi: quelli che mancavano per fare il salto.
 *  retino     — mezzatinta a punti (stampa, risografia)
 *  duotono    — tutta la tavola ridotta a due inchiostri
 *  deforma    — onde, torsioni, scorrimenti su un livello
 *  caleido    — simmetria a spicchi: l'immagine diventa ornamento o esplosione
 *  flusso     — migliaia di particelle che seguono un campo: tessuto, vento, corrente
 *  tipografia — la parola come immagine: gigante tagliata, tessitura di frasi, barra
 *  grafico    — i suoi numeri in un grafico poetico (fiducia, letture, legami)
 *  ombra      — estrusione e ombra portata: il segno diventa oggetto
 *  sfasa      — fuori registro: canali di colore spostati, come una stampa sbagliata
 */
import { pick, range, chance, type Rnd } from '../core/rng'
import { FACES, loadLabFonts, perCarattere, type FaceId } from '@/components/studio/genera/fonts'
import { tempoDi, finestra } from './tempo'
import { fontCss, type Face } from '@/components/studio/genera/raster'
import { newCanvas, withLayer, replaceLayer, fullLayer, flatten, type Sheet, type Layer, type Blend } from './sheet'
import type { Tool, ToolCtx } from './tools'

let n = 0
const lid = () => `n${Date.now().toString(36)}${(n++).toString(36)}`
const LOCKED = new Set(['testo', 'firma', 'piastra', 'mappa', 'etichette'])
const liberi = (s: Sheet) => s.layers.filter(l => !LOCKED.has(l.kind))
const colori = (c: ToolCtx) => (c.colori?.length ? c.colori : [c.tone.ink, c.tone.acc])
const hexRgb = (h: string) => { const v = parseInt(h.replace('#', '').slice(0, 6), 16); return [v >> 16, (v >> 8) & 255, v & 255] }
const bonus = (c: ToolCtx, id: string) => (c.preferiti?.includes(id) ? true : false)
void bonus

/** schiaccia la tavola (solo i livelli liberi) in un'immagine, lasciando sopra testo e firma */
function piatto(s: Sheet): { img: HTMLCanvasElement; resto: Layer[] } {
  const base = { ...s, layers: liberi(s) }
  return { img: flatten(base), resto: s.layers.filter(l => LOCKED.has(l.kind)) }
}

const retino: Tool = {
  id: 'retino', label: 'Retino', nature: 'materia', pushes: { punti: 0.4, contrasto: 0.2 },
  available: s => liberi(s).length > 0,
  propose: (_s, c) => ({ passo: Math.round(range(c.r, 6, 16)), angolo: pick(c.r, [0, 15, 45, 75]), colore: pick(c.r, colori(c)), sostituisci: chance(c.r, 0.5), alpha: range(c.r, 0.6, 1) }),
  apply: async (s, p, c) => {
    const T = tempoDi(c)
    const { img, resto } = piatto(s)
    const g0 = img.getContext('2d')!, d = g0.getImageData(0, 0, img.width, img.height).data
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    const st = p.passo as number, an = ((p.angolo as number) * Math.PI) / 180
    g.fillStyle = p.colore as string
    g.translate(s.W / 2, s.H / 2); g.rotate(an); g.translate(-s.W, -s.H)
    for (let y = 0; y < s.H * 2; y += st) for (let x = 0; x < s.W * 2; x += st) {
      // coordinate nel foglio (ruotate indietro)
      const dx = x - s.W, dy = y - s.H
      const fx = s.W / 2 + dx * Math.cos(an) - dy * Math.sin(an), fy = s.H / 2 + dx * Math.sin(an) + dy * Math.cos(an)
      if (fx < 0 || fy < 0 || fx >= s.W || fy >= s.H) continue
      const i = (Math.floor(fy) * img.width + Math.floor(fx)) * 4
      const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255
      const f = finestra(T.crescita, Math.floor(fy / st), Math.ceil(s.H / st), 0.5)
      const rad = (1 - lum) * st * 0.62 * f * (1 + 0.12 * T.a * Math.sin(T.fase * 6.283 + (fx + fy) * 0.01))
      if (rad > 0.4) { g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill() }
    }
    const lay = fullLayer(s, lid(), 'retino', cv, 'source-over', p.alpha as number)
    return p.sostituisci ? { ...s, layers: [lay, ...resto] } : withLayer(s, { ...lay, blend: 'multiply' })
  },
}

const duotono: Tool = {
  id: 'duotono', label: 'Duotono', nature: 'luce', pushes: { saturazione: -0.2, contrasto: 0.2 },
  available: s => liberi(s).length > 0,
  propose: (_s, c) => { const cs = colori(c); return { a: pick(c.r, [c.tone.bg, ...cs]), b: pick(c.r, cs), soglia: chance(c.r, 0.3) } },
  apply: async (s, p) => {
    const { img, resto } = piatto(s)
    const g = img.getContext('2d')!, im = g.getImageData(0, 0, img.width, img.height), d = im.data
    const A = hexRgb(p.a as string), B = hexRgb(p.b as string)
    for (let i = 0; i < d.length; i += 4) {
      let t = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255
      if (p.soglia) t = t > 0.5 ? 1 : 0
      d[i] = A[0] * t + B[0] * (1 - t); d[i + 1] = A[1] * t + B[1] * (1 - t); d[i + 2] = A[2] * t + B[2] * (1 - t); d[i + 3] = 255
    }
    g.putImageData(im, 0, 0)
    return { ...s, layers: [fullLayer(s, lid(), 'duotono', img), ...resto] }
  },
}

const deforma: Tool = {
  id: 'deforma', label: 'Deformazione', nature: 'trasformazione', pushes: { diagonali: 0.1, complessita: 0.15 },
  available: s => liberi(s).length > 0,
  propose: (s, c) => ({ layer: pick(c.r, liberi(s)).id, modo: pick(c.r, ['onda', 'scorri', 'torci', 'scala']), forza: range(c.r, 0.02, 0.12), freq: range(c.r, 2, 12) }),
  apply: async (s, p, c) => {
    const T = tempoDi(c)
    const l = s.layers.find(x => x.id === p.layer)
    if (!l) return s
    let nCella = 0
    const W = l.canvas.width, H = l.canvas.height, f = p.forza as number, fr = p.freq as number
    const cv = newCanvas(W, H), g = cv.getContext('2d')!
    if (p.modo === 'onda' || p.modo === 'scorri') {
      const strisce = 120
      for (let i = 0; i < strisce; i++) {
        const y = (i * H) / strisce, dx = p.modo === 'onda' ? Math.sin((i / strisce) * Math.PI * fr) * W * f : (i % 7 < 2 ? W * f * 2 : 0)
        g.drawImage(l.canvas, 0, y, W, H / strisce + 1, dx, y, W, H / strisce + 1)
      }
    } else if (p.modo === 'torci') {
      const strisce = 90
      for (let i = 0; i < strisce; i++) {
        const y = (i * H) / strisce, k = 1 + Math.sin((i / strisce) * Math.PI * fr) * f * 3
        g.drawImage(l.canvas, 0, y, W, H / strisce + 1, (W - W * k) / 2, y, W * k, H / strisce + 1)
      }
    } else {
      for (let i = 0; i < 8; i++) { const k = 1 - i * f; g.globalAlpha = 1 - i * 0.11; g.drawImage(l.canvas, (W - W * k) / 2, (H - H * k) / 2, W * k, H * k) }
    }
    return replaceLayer(s, l.id, { canvas: cv })
  },
}

const caleido: Tool = {
  id: 'caleido', label: 'Caleidoscopio', nature: 'ripetizione', pushes: { simmetria: 0.5, complessita: 0.2 },
  available: s => liberi(s).length > 0,
  propose: (_s, c) => ({ spicchi: pick(c.r, [4, 6, 8, 12]), cx: range(c.r, 0.35, 0.65), cy: range(c.r, 0.3, 0.6), sostituisci: chance(c.r, 0.4), alpha: range(c.r, 0.5, 1), blend: pick(c.r, ['source-over', 'screen', 'multiply', 'difference']) }),
  apply: async (s, p, c) => {
    const T = tempoDi(c)
    const { img, resto } = piatto(s)
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    const n0 = p.spicchi as number, a = (Math.PI * 2) / n0, R = Math.hypot(s.W, s.H)
    const cx = ((p.cx as number) + Math.sin(T.fase * 6.283) * 0.04 * T.a) * s.W, cy = ((p.cy as number) + Math.cos(T.fase * 6.283) * 0.04 * T.a) * s.H
    for (let k = 0; k < Math.ceil(n0 * T.crescita); k++) {
      g.save(); g.translate(s.W / 2, s.H / 2); g.rotate(k * a); if (k % 2) g.scale(1, -1)
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, 0, a + 0.01); g.closePath(); g.clip()
      g.drawImage(img, -cx, -cy); g.restore()
    }
    const lay = fullLayer(s, lid(), 'caleido', cv, p.blend as Blend, p.alpha as number)
    return p.sostituisci ? { ...s, layers: [lay, ...resto] } : withLayer(s, lay)
  },
}

const flusso: Tool = {
  id: 'flusso', label: 'Campo di flusso', nature: 'segno', pushes: { linee: 0.4, complessita: 0.25 },
  available: () => true,
  propose: (_s, c) => ({ n: Math.round(range(c.r, 300, 1400)), passi: Math.round(range(c.r, 20, 80)), scala: range(c.r, 0.002, 0.012), giro: range(c.r, 1, 6), colori: colori(c).slice(0, 3), spessore: range(c.r, 0.6, 3), alpha: range(c.r, 0.25, 0.8), seme: c.r() * 1000 }),
  apply: async (s, p, c) => {
    const T = tempoDi(c)
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    // vita: il campo deriva lentamente (la fase sposta il seme); crescita: le linee si allungano tutte insieme lungo il campo
    const sc = p.scala as number, gi = (p.giro as number) * (1 + 0.04 * T.a * Math.sin(T.fase * 6.283)), se = p.seme as number
    const ang = (x: number, y: number) => (Math.sin(x * sc + se) + Math.cos(y * sc * 1.3 - se) + Math.sin((x + y) * sc * 0.7)) * gi
    let a = Math.floor((p.seme as number) * 1e6) >>> 0
    const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
    g.lineWidth = p.spessore as number; g.lineCap = 'round'; g.globalAlpha = p.alpha as number
    const cs = p.colori as string[]
    for (let i = 0; i < (p.n as number); i++) {
      let x = rnd() * s.W, y = rnd() * s.H
      g.strokeStyle = cs[i % cs.length]
      g.beginPath(); g.moveTo(x, y)
      const np = Math.round((p.passi as number) * finestra(T.crescita, i, p.n as number, 0.7))
      if (np < 1) continue
      for (let k = 0; k < np; k++) { const t = ang(x, y); x += Math.cos(t) * 4; y += Math.sin(t) * 4; g.lineTo(x, y) }
      g.stroke()
    }
    return withLayer(s, fullLayer(s, lid(), 'flusso', cv))
  },
}

const tipografia: Tool = {
  id: 'tipografia', label: 'Parola come immagine', nature: 'parola', pushes: { contrasto: 0.2, orizzontali: 0.1 },
  available: (_s, c) => !!c.tipoOk,
  propose: (_s, c) => ({ modo: pick(c.r, ['gigante', 'tessitura', 'barra', 'colonna']), testo: c.say().slice(0, 140), face: pick(c.r, ['condensato', 'espanso', 'grotesk', 'bodoni', 'gotico', 'mono'] as FaceId[]), colore: pick(c.r, colori(c)), barra: pick(c.r, [c.tone.acc, c.tone.ink, ...colori(c)]), y: range(c.r, 0.15, 0.85), blend: pick(c.r, ['source-over', 'difference', 'multiply', 'overlay']) }),
  apply: async (s, p) => {
    await loadLabFonts()
    const F: Face = FACES[p.face as FaceId] ?? FACES.grotesk
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    const testo = String(p.testo || '').trim()
    if (!testo) return s
    const parola = testo.split(/\s+/).sort((a, b) => b.length - a.length)[0] ?? testo
    const T = (x: string) => perCarattere(F.upper ? x.toUpperCase() : x, F.family)
    g.fillStyle = p.colore as string; g.textBaseline = 'middle'
    switch (p.modo) {
      case 'gigante': { const size = s.H * 0.42; g.font = fontCss(F, size); g.save(); g.translate(s.W * 0.5, (p.y as number) * s.H); g.rotate(-Math.PI / 2 * (Math.random() < 0.3 ? 1 : 0)); g.textAlign = 'center'; g.fillText(T(parola), 0, 0); g.restore(); break }
      case 'tessitura': { const size = Math.round(s.W * 0.018); g.font = fontCss(F, size); g.globalAlpha = 0.55; let y = size; const riga = T(testo) + ' · '; while (y < s.H) { g.fillText(riga.repeat(6), -((y * 7) % 200), y); y += size * 1.25 } break }
      case 'barra': { const size = Math.round(s.W * 0.06); g.font = fontCss(F, size); const t = T(testo.split(/[.,;:]/)[0].slice(0, 40)); const w = g.measureText(t).width; const y = (p.y as number) * s.H; g.fillStyle = p.barra as string; g.fillRect(s.W * 0.05, y - size * 0.7, w + size, size * 1.4); g.fillStyle = p.colore === p.barra ? '#f4f2ec' : (p.colore as string); g.fillText(t, s.W * 0.05 + size / 2, y); break }
      default: { const size = Math.round(s.W * 0.05); g.font = fontCss(F, size); const parole = T(testo).split(/\s+/).slice(0, 12); parole.forEach((w, i) => g.fillText(w, s.W * 0.08, size * (1.2 + i * 1.05))) }
    }
    return withLayer(s, { ...fullLayer(s, lid(), 'tipografia', cv, p.blend as Blend) })
  },
}

const grafico: Tool = {
  id: 'grafico', label: 'Grafico', nature: 'struttura', pushes: { verticali: 0.2, linee: 0.1 },
  // un grafico con due barre non dice niente: solo se i dati bastano a mostrare un andamento
  available: (_s, c) => (c.dati?.length ?? 0) >= 5,
  propose: (_s, c) => ({ tipo: pick(c.r, (c.dati?.length ?? 0) >= 8 ? ['barre', 'punti', 'radiale'] : ['punti', 'radiale']), colore: pick(c.r, colori(c)), x: range(c.r, 0.1, 0.25), y: range(c.r, 0.15, 0.5), w: range(c.r, 0.5, 0.8), h: range(c.r, 0.2, 0.4) }),
  apply: async (s, p, c) => {
    const ds = (c.dati ?? []).slice(0, 12)
    if (!ds.length) return s
    await loadLabFonts()
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    const x0 = (p.x as number) * s.W, y0 = (p.y as number) * s.H, W = (p.w as number) * s.W, H = (p.h as number) * s.H
    const max = Math.max(...ds.map(d => d.v), 1e-6)
    g.fillStyle = g.strokeStyle = p.colore as string; g.lineWidth = 2
    g.font = fontCss(FACES.mono, Math.round(s.W * 0.013)); g.textBaseline = 'top'
    if (p.tipo === 'radiale') {
      const cx = x0 + W / 2, cy = y0 + H / 2, R = Math.min(W, H) / 2
      ds.forEach((d, i) => { const a = (i / ds.length) * Math.PI * 2, rr = (d.v / max) * R; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); g.stroke(); g.fillText(d.label.toUpperCase(), cx + Math.cos(a) * (R + 8), cy + Math.sin(a) * (R + 8)) })
    } else {
      const bw = W / ds.length
      const T = tempoDi(c)
      ds.forEach((d, i) => {
        const h = (d.v / max) * H * finestra(T.crescita, i, ds.length, 0.5) * (1 + 0.04 * T.a * Math.sin(T.fase * 6.283 + i))
        if (p.tipo === 'barre') g.fillRect(x0 + i * bw + bw * 0.15, y0 + H - h, bw * 0.7, h)
        else { g.beginPath(); g.arc(x0 + i * bw + bw / 2, y0 + H - h, 5, 0, Math.PI * 2); g.fill() }
        g.save(); g.translate(x0 + i * bw + bw / 2, y0 + H + 6); g.rotate(Math.PI / 4); g.fillText(d.label.toUpperCase(), 0, 0); g.restore()
      })
      g.beginPath(); g.moveTo(x0, y0 + H); g.lineTo(x0 + W, y0 + H); g.stroke()
    }
    return withLayer(s, fullLayer(s, lid(), 'grafico', cv))
  },
}

/** quanto una sagoma è piena: pixel opachi sul rettangolo che li contiene */
const corpi = new WeakMap<HTMLCanvasElement, number>()
function corpo(cv: HTMLCanvasElement) {
  const v = corpi.get(cv); if (v !== undefined) return v
  const t = newCanvas(48, 48), g = t.getContext('2d')!; g.drawImage(cv, 0, 0, 48, 48)
  const d = g.getImageData(0, 0, 48, 48).data; let n = 0, x0 = 48, y0 = 48, x1 = -1, y1 = -1
  for (let i = 0; i < 48 * 48; i++) if (d[i * 4 + 3] > 60) { n++; const x = i % 48, y = (i / 48) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const r = n ? n / ((x1 - x0 + 1) * (y1 - y0 + 1)) : 0; corpi.set(cv, r); return r
}
const ombra: Tool = {
  id: 'ombra', label: 'Ombra / estrusione', nature: 'struttura', pushes: { contrasto: 0.1, superfici: 0.1 },
  // l'estrusione ha senso su una sagoma piena; su un disegno a linee sottili fa solo poltiglia
  available: s => liberi(s).some(l => l.scale < 1.2 && corpo(l.canvas) > 0.18),
  propose: (s, c) => ({ layer: pick(c.r, liberi(s).filter(l => l.scale < 1.2 && corpo(l.canvas) > 0.18).length ? liberi(s).filter(l => l.scale < 1.2 && corpo(l.canvas) > 0.18) : liberi(s)).id, passi: Math.round(range(c.r, 1, 8)), dx: range(c.r, -0.01, 0.01), dy: range(c.r, 0.003, 0.012), colore: pick(c.r, [c.tone.ink, '#000000', ...colori(c)]) }),
  apply: async (s, p) => {
    const i = s.layers.findIndex(x => x.id === p.layer)
    if (i < 0) return s
    const l = s.layers[i]
    const sil = newCanvas(l.canvas.width, l.canvas.height), g = sil.getContext('2d')!
    g.drawImage(l.canvas, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = p.colore as string; g.fillRect(0, 0, sil.width, sil.height)
    const ombre: Layer[] = []
    for (let k = (p.passi as number); k >= 1; k--) ombre.push({ ...l, id: lid(), kind: 'ombra', canvas: sil, x: l.x + (p.dx as number) * k, y: l.y + (p.dy as number) * k, alpha: (p.passi as number) > 3 ? 1 : 0.6, blend: 'source-over' })
    const layers = s.layers.slice(); layers.splice(i, 0, ...ombre)
    return { ...s, layers }
  },
}

const sfasa: Tool = {
  id: 'sfasa', label: 'Fuori registro', nature: 'trasformazione', pushes: { complessita: 0.1, saturazione: 0.1 },
  available: s => liberi(s).length > 0,
  propose: (_s, c) => ({ dx: Math.round(range(c.r, 4, 22)) * (chance(c.r, 0.5) ? 1 : -1), dy: Math.round(range(c.r, -10, 10)) }),
  apply: async (s, p) => {
    const { img, resto } = piatto(s)
    const g0 = img.getContext('2d')!, src = g0.getImageData(0, 0, img.width, img.height), out = g0.createImageData(img.width, img.height)
    const W = img.width, H = img.height, dx = p.dx as number, dy = p.dy as number
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4
      const xr = Math.min(W - 1, Math.max(0, x + dx)), yr = Math.min(H - 1, Math.max(0, y + dy)), or = (yr * W + xr) * 4
      const xb = Math.min(W - 1, Math.max(0, x - dx)), yb = Math.min(H - 1, Math.max(0, y - dy)), ob = (yb * W + xb) * 4
      out.data[o] = src.data[or]; out.data[o + 1] = src.data[o + 1]; out.data[o + 2] = src.data[ob + 2]; out.data[o + 3] = 255
    }
    g0.putImageData(out, 0, 0)
    return { ...s, layers: [fullLayer(s, lid(), 'sfasa', img), ...resto] }
  },
}

/**
 * Ornato: la ripetizione come la insegna Lewis F. Day (Pattern Design, 1903).
 * Un motivo su un'ossatura: quadrato, mezzo-salto ("drop repeat"), mattone, diamante, triangolo/esagono,
 * squame, ogiva, spolvero (motivi sparsi su una griglia nascosta), fregio (bordo). Due operazioni sul motivo:
 * il ribaltamento ("turnover", a specchio una cella sì e una no) e la rotazione ("turn-round", di 90° per cella).
 * L'ossatura a volte resta visibile come un traliccio sottile.
 */
const ornato: Tool = {
  id: 'ornato', label: 'Ornato (ripetizione alla Day)', nature: 'ripetizione', pushes: { simmetria: 0.4, elementi: 0.3, complessita: 0.1 },
  available: s => liberi(s).some(l => l.scale < 1.2),
  propose: (s, c) => ({
    layer: pick(c.r, liberi(s).filter(l => l.scale < 1.2)).id,
    sistema: pick(c.r, ['quadrato', 'mezzosalto', 'mattone', 'diamante', 'triangolo', 'squame', 'ogiva', 'spolvero', 'fregio']),
    op: pick(c.r, ['nessuna', 'ribalta', 'gira']), passo: range(c.r, 0.12, 0.3), scala: range(c.r, 0.55, 0.95),
    traliccio: chance(c.r, 0.35), colore: pick(c.r, colori(c)), alpha: range(c.r, 0.6, 1), sostituisci: chance(c.r, 0.3),
  }),
  apply: async (s, p, c) => {
    const T = tempoDi(c)
    const l = s.layers.find(x => x.id === p.layer)
    if (!l) return s
    let nCella = 0
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    const P = (p.passo as number) * s.W, k = (p.scala as number) * P, sis = p.sistema as string, op = p.op as string
    const asp = l.canvas.height / l.canvas.width
    const totCelle = (Math.ceil(s.W / ((p.passo as number) * s.W)) + 3) * (Math.ceil(s.H / ((p.passo as number) * s.W)) + 3)
    const cella = (x: number, y: number, i: number, j: number) => {
      // crescita: le celle compaiono una dopo l'altra, come si stampa un modulo; vita: ogni cella oscilla appena, sfasata
      const f = finestra(T.crescita, nCella++, totCelle, 0.3)
      if (f <= 0) return
      g.save(); g.translate(x, y); g.rotate(Math.sin(T.fase * 6.283 + i * 0.7 + j * 1.1) * 0.06 * T.a); g.scale(f, f)
      if (op === 'ribalta' && (i + j) % 2) g.scale(-1, 1)
      if (op === 'gira') g.rotate(((i + j * 2) % 4) * Math.PI / 2)
      if (sis === 'diamante' || sis === 'ogiva') g.rotate(Math.PI / 4 * (sis === 'diamante' ? 0 : 0))
      g.drawImage(l.canvas, -k / 2, -(k * asp) / 2, k, k * asp)
      g.restore()
    }
    g.globalAlpha = p.alpha as number
    const nx = Math.ceil(s.W / P) + 2, ny = Math.ceil(s.H / P) + 2
    if (sis === 'fregio') {
      const n = Math.ceil(s.W / P) + 1
      for (let i = 0; i < n; i++) { cella(i * P, P * 0.6, i, 0); cella(i * P + P / 2, s.H - P * 0.6, i, 1) }
    } else {
      let a = 7
      const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
      for (let j = -1; j < ny; j++) for (let i = -1; i < nx; i++) {
        let x = i * P, y = j * P
        if (sis === 'mezzosalto' && i % 2) y += P / 2
        if (sis === 'mattone' && j % 2) x += P / 2
        if (sis === 'diamante' || sis === 'triangolo') { if (j % 2) x += P / 2; y = j * P * (sis === 'triangolo' ? 0.866 : 0.5) }
        if (sis === 'squame') { if (j % 2) x += P / 2; y = j * P * 0.5 }
        if (sis === 'ogiva') { if (j % 2) x += P / 2; y = j * P * 0.6 }
        if (sis === 'spolvero') { x += (rnd() - 0.5) * P * 0.3; y += (rnd() - 0.5) * P * 0.3; if (rnd() < 0.25) continue }
        cella(x, y, i, j)
      }
      // l'ossatura visibile: traliccio sottile
      if (p.traliccio) {
        g.globalAlpha = 0.45; g.strokeStyle = p.colore as string; g.lineWidth = 1.2
        g.beginPath()
        if (sis === 'diamante' || sis === 'squame' || sis === 'ogiva' || sis === 'triangolo') for (let v = -s.H; v < s.W + s.H; v += P) { g.moveTo(v, 0); g.lineTo(v - s.H, s.H); g.moveTo(v - s.H, 0); g.lineTo(v, s.H) }
        else { for (let x = 0; x < s.W + P; x += P) { g.moveTo(x - P / 2, 0); g.lineTo(x - P / 2, s.H) } for (let y = 0; y < s.H + P; y += P) { g.moveTo(0, y - P / 2); g.lineTo(s.W, y - P / 2) } }
        g.stroke()
      }
    }
    const lay = fullLayer(s, lid(), 'ornato', cv)
    return p.sostituisci ? { ...s, layers: [...s.layers.filter(x => x.id !== l.id && !LOCKED.has(x.kind)).slice(0, 1), lay, ...s.layers.filter(x => LOCKED.has(x.kind))] } : withLayer(s, lay)
  },
}

export const NUOVI: Tool[] = [ornato, retino, duotono, deforma, caleido, flusso, tipografia, grafico, ombra, sfasa]
