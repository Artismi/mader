/**
 * Palette generative (V5) in OKLCH: dalla foto (campioni k-medie), dal colore
 * del marchio o da un'armonia (analoghi, complementari, tinte divise, triade,
 * monocromia spinta). Il contrasto di lettura è garantito per costruzione
 * (`fino` sposta la luminosità finché basta). Le schede di stile fisse restano
 * un'opzione: si sostituiscono solo le identità generate (id:…).
 */
import type { Style } from '../../styles'
import type { Pix } from '../tools'
import type { DesignContent } from '../../types'
import { oklch, toOklch, fino, contrasto, nomeTinta } from '../../core/colore'
import { rng, hashText, type Rng } from '../knobs'

export type Sorgente = 'identita' | 'foto' | 'marchio' | 'analoghi' | 'complementari' | 'divisi' | 'triade' | 'spinta'
type Tono = 'chiaro' | 'scuro' | 'colore'
interface Campione { L: number; C: number; h: number; peso: number }

const lab = (L: number, C: number, h: number) => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)]

/** Campioni della foto: k-medie in OKLab su ~600 pixel, ordinati per peso. */
export function campioni(pix: Pix, k = 5): Campione[] {
  const pts: number[][] = []
  const step = Math.max(1, Math.floor(pix.data.length / 4 / 600)) * 4
  for (let i = 0; i < pix.data.length; i += step) {
    const hex = '#' + [0, 1, 2].map(j => pix.data[i + j].toString(16).padStart(2, '0')).join('')
    pts.push(lab(...toOklch(hex)))
  }
  if (pts.length < k) return []
  let cen = Array.from({ length: k }, (_, i) => pts[Math.floor((i + 0.5) * pts.length / k)].slice())
  let lab0: number[] = []
  for (let it = 0; it < 8; it++) {
    lab0 = pts.map(p => cen.reduce((b, c, j) => ((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 < (p[0] - cen[b][0]) ** 2 + (p[1] - cen[b][1]) ** 2 + (p[2] - cen[b][2]) ** 2 ? j : b), 0))
    cen = cen.map((c, j) => {
      const m = pts.filter((_, i) => lab0[i] === j)
      return m.length ? [0, 1, 2].map(d => m.reduce((a, p) => a + p[d], 0) / m.length) : c
    })
  }
  return cen.map((c, j) => ({ L: c[0], C: Math.hypot(c[1], c[2]), h: ((Math.atan2(c[2], c[1]) * 180) / Math.PI + 360) % 360, peso: lab0.filter(x => x === j).length / pts.length }))
    .sort((a, b) => b.peso - a.peso)
}

type Colori = Pick<Style, 'bg' | 'surface' | 'ink' | 'muted' | 'accent' | 'accent2' | 'onAccent' | 'dark'>

const mixHex = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  return '#' + [16, 8, 0].map(sh => Math.round(((pa >> sh) & 255) + ((((pb >> sh) & 255) - ((pa >> sh) & 255)) * t)).toString(16).padStart(2, '0')).join('')
}

/** Dai colori di partenza alla palette completa, con i contrasti garantiti. */
function costruisci(r: Rng, tono: Tono, h: number, cFondo: number, a1: [number, number], a2: [number, number]): Colori {
  let bg: string, ink: string
  if (tono === 'chiaro') { bg = oklch(r.range(0.93, 0.985), Math.min(cFondo, 0.05), h); ink = fino(r.range(0.14, 0.24), 0.03, a1[0], bg, 8) }
  else if (tono === 'scuro') { bg = oklch(r.range(0.11, 0.22), Math.min(cFondo, 0.07), h); ink = fino(r.range(0.93, 0.98), 0.02, a1[0], bg, 9) }
  else {
    bg = oklch(r.range(0.58, 0.8), Math.max(cFondo, 0.11), h)
    const scuro = oklch(0.17, 0.035, h), chiaro = oklch(0.98, 0.01, h)
    ink = contrasto(scuro, bg) >= contrasto(chiaro, bg) ? scuro : chiaro
  }
  const dark = toOklch(bg)[0] < 0.5
  const accent = fino(dark ? 0.78 : tono === 'colore' ? (toOklch(ink)[0] > 0.5 ? 0.94 : 0.26) : 0.6, a1[1], a1[0], bg, 3)
  const accent2 = fino(dark ? 0.68 : 0.7, a2[1], a2[0], bg, 2)
  const surface = mixHex(bg, tono === 'colore' ? ink : accent, tono === 'colore' ? 0.1 : 0.12)
  let muted = mixHex(ink, bg, 0.38)
  if (contrasto(muted, bg) < 4.5) muted = mixHex(ink, bg, 0.2)
  const onAccent = [bg, ink, '#ffffff', '#111111'].sort((a, b) => contrasto(b, accent) - contrasto(a, accent))[0]
  return { bg, surface, ink, muted, accent, accent2, onAccent, dark }
}

const TONI: Tono[] = ['chiaro', 'scuro', 'colore']

/** Palette dalla foto: fondo dal campione più esteso, accenti dai più saturi. */
function daFoto(r: Rng, pix: Pix): Colori | null {
  const cs = campioni(pix)
  if (!cs.length) return null
  const saturi = [...cs].sort((a, b) => b.C * Math.sqrt(b.peso) - a.C * Math.sqrt(a.peso))
  const base = cs[0], a1 = saturi[0], a2 = saturi.find(c => Math.abs(((c.h - a1.h + 540) % 360) - 180) < 150) ?? saturi[1] ?? a1
  // il tono segue la foto: chiara → fondo chiaro o colore, scura → fondo scuro
  const tono: Tono = base.L > 0.62 ? r.pick(['chiaro', 'colore'] as Tono[]) : base.L < 0.35 ? 'scuro' : r.pick(TONI)
  return costruisci(r, tono, base.C > 0.03 ? base.h : a1.h, Math.max(0.02, base.C), [a1.h, Math.max(0.12, a1.C * 1.2)], [a2.h, Math.max(0.09, a2.C)])
}

/** Palette da un'armonia attorno a una tinta (del marchio, della foto o libera). */
function daArmonia(r: Rng, s: Exclude<Sorgente, 'identita' | 'foto'>, h: number): Colori {
  const off = { marchio: r.pick([0, 30, 180]), analoghi: r.pick([30, -30, 45]), complementari: 180, divisi: r.pick([150, -150]), triade: r.pick([120, -120]), spinta: 0 }[s]
  const h2 = (h + off + 360) % 360
  if (s === 'spinta') {
    // monocromia spinta: tutto nella stessa tinta, fondo saturo, inchiostro e accento agli estremi della luminosità
    const bg = oklch(r.range(0.5, 0.72), 0.2, h)
    const scuro = oklch(0.15, 0.06, h), chiaro = oklch(0.97, 0.025, h)
    const ink = contrasto(scuro, bg) >= contrasto(chiaro, bg) ? scuro : chiaro
    const accent = fino(toOklch(ink)[0] > 0.5 ? 0.3 : 0.9, 0.16, h, bg, 3)
    const accent2 = fino(toOklch(bg)[0] + 0.15, 0.22, h, bg, 1.6)
    return { bg, surface: mixHex(bg, ink, 0.12), ink, muted: mixHex(ink, bg, 0.25), accent, accent2, onAccent: bg, dark: toOklch(bg)[0] < 0.5 }
  }
  // il fondo chiaro neutro è già la scelta più frequente delle identità: qui pesa meno
  const tono: Tono = r.chance(0.25) ? 'chiaro' : r.chance(0.5) ? 'scuro' : 'colore'
  return costruisci(r, tono, h, r.range(0.01, 0.06), [h, r.range(0.14, 0.22)], [h2, r.range(0.1, 0.2)])
}

/**
 * Sorgente della palette per questa composizione (deterministica dal seme): le tre composizioni
 * di un'identità condividono caratteri e forme, ma non per forza i colori.
 */
export function sorgentePalette(k: { stile: string; seme?: number }, c: DesignContent, pix?: Pix): Sorgente {
  if (!k.stile.startsWith('id:')) return 'identita'
  const x = (hashText(`${k.stile}|${k.seme ?? 0}|palette`) % 1000) / 1000
  const marchio = !!(c.progetto as { colore?: { accento?: string } } | undefined)?.colore?.accento
  const voci: [Sorgente, number][] = [['identita', 0.3], ['foto', pix ? 0.24 : 0], ['marchio', marchio ? 0.12 : 0], ['spinta', 0.1], ['complementari', 0.08], ['divisi', 0.07], ['analoghi', 0.06], ['triade', 0.04]]
  const tot = voci.reduce((a, [, p]) => a + p, 0)
  let t = x * tot
  for (const [s, p] of voci) if ((t -= p) <= 0) return s
  return 'identita'
}

/** Lo stile con la palette generativa al posto di quella dell'identità (nome aggiornato). */
export function conPalette(s: Style, k: { stile: string; seme?: number }, c: DesignContent, pix?: Pix): Style {
  const src = sorgentePalette(k, c, pix)
  if (src === 'identita') return s
  const r = rng(hashText(`${k.stile}|${k.seme ?? 0}|${src}`))
  const marchio = (c.progetto as { colore?: { accento?: string } } | undefined)?.colore?.accento
  const h0 = marchio && /^#[0-9a-f]{6}$/i.test(marchio) ? toOklch(marchio)[2] : pix ? (campioni(pix).sort((a, b) => b.C - a.C)[0]?.h ?? r.range(0, 360)) : r.range(0, 360)
  const col = src === 'foto' && pix ? daFoto(r, pix) : daArmonia(r, src === 'foto' ? 'analoghi' : src, src === 'marchio' || r.chance(0.4) ? h0 : r.range(0, 360))
  if (!col) return s
  const nome = `${nomeTinta(toOklch(col.bg)[2])} · ${src === 'foto' ? 'dalla foto' : src === 'marchio' ? 'dal marchio' : src === 'spinta' ? 'monocromia spinta' : src}`
  return { ...s, ...col, name: `${nome} · ${s.name.split(' · ').slice(1).join(' · ')}`, keywords: [...s.keywords, `palette:${src}`] }
}
