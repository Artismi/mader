/**
 * Le pagine del cantiere: quando l'artista vuole mostrare quello che sta scrivendo.
 * Copertina (il cantiere si apre), pagina di libro (tanto testo, colonna, note,
 * i segni del capitolo a margine), diapositiva (titolo, tre punti, un segno grande).
 */
import type { AgentState } from '../core/types'
import { pick, range, type Rnd } from '../core/rng'
import type { Tone } from '@/components/studio/genera/recipes'
import { FACES, type FaceId } from '@/components/studio/genera/fonts'
import { newCanvas, withLayer, fullLayer, type Sheet } from '../hands/sheet'
import { textLayer, toolById, type ToolCtx } from '../hands/tools'
import { ratio } from '../eyes/judgement'
import { segnoDi } from './atlante'
import type { Lavoro } from './cantiere'

const lid = () => `p${Math.random().toString(36).slice(2, 9)}`

export type Formato = 'copertina' | 'pagina' | 'diapositiva'
export function formatoDi(l: Lavoro): Formato {
  if (l.cantiere.capitoli.length === 1 && l.capitolo.paragrafi.length === 1) return 'copertina'
  return l.cantiere.forma === 'presentazione' ? 'diapositiva' : 'pagina'
}

export async function rendiPagina(st: AgentState, r: Rnd, l: Lavoro, s0: Sheet, ctx: ToolCtx, face: FaceId): Promise<Sheet> {
  const t: Tone = ctx.tone
  let s = s0
  const M = Math.min(s.W, s.H)
  const ink = [t.ink, t.acc, '#111111', '#f4f2ec'].sort((a, b) => ratio(b, t.bg) - ratio(a, t.bg))[0]
  const prova = { ...s, layers: [] }
  const scrivi = async (text: string, left: number, top: number, size: number, maxW: number, f: FaceId = face, color = ink, align: CanvasTextAlign = 'left') => {
    const L = (await textLayer(prova, { text, face: f, sizePx: size * M, color, x: 0, y: 0, maxW, align })).layers[0]
    const w = L.canvas.width / s.W, h = L.canvas.height / s.H
    s = withLayer(s, { ...L, x: (align === 'right' ? left - w : left) + w / 2, y: top + h / 2 })
    return h
  }
  // il corpo del testo in un carattere da lettura (mai tutto maiuscolo)
  const lettura: FaceId = (FACES[face] as { upper?: boolean }).upper ? ((Object.keys(FACES) as FaceId[]).find(id => !(FACES[id] as { upper?: boolean }).upper && id !== 'mono') ?? face) : face
  const C = l.cantiere, k = l.capitolo, p = l.paragrafo
  const nCap = C.capitoli.indexOf(k) + 1
  const formato = formatoDi(l)
  const segno = async (w: string, x: number, y: number, scale: number) => {
    const cv = await segnoDi(st, r, w, t, ctx)
    s = withLayer(s, { id: lid(), kind: 'motivo', canvas: cv, x, y, scale, rot: 0, alpha: 1, blend: 'source-over' })
  }
  // un po' di materia, ma la pagina resta leggibile
  const usa = async (id: string, params: Record<string, unknown>) => { const tool = toolById(id); if (tool) s = await tool.apply(s, params, ctx) }

  if (formato === 'copertina') {
    if (ctx.shaders.some(x => x.code) && r() < 0.6) await usa('shader', { ...toolById('shader')!.propose(s, ctx), alpha: range(r, 0.5, 0.9) })
    else await usa('pattern', { ...toolById('pattern')!.propose(s, ctx), alpha: 0.5 })
    await segno(C.tema, 0.5, 0.5, 0.62)
    const cv = newCanvas(s.W, Math.round(s.H * 0.3)), g = cv.getContext('2d')!
    g.fillStyle = t.bg; g.fillRect(0, 0, cv.width, cv.height)
    s = withLayer(s, { id: lid(), kind: 'piastra', canvas: cv, x: 0.5, y: 0.85, scale: s.W / M, rot: 0, alpha: 0.94, blend: 'source-over' })
    const h = await scrivi(C.titolo.toUpperCase(), 0.07, 0.73, C.titolo.length > 24 ? 0.065 : 0.085, 0.86)
    await scrivi(`${C.forma} · cominciato il giorno ${C.nato}${C.da ? ` · dopo «${C.da}»` : ''}`, 0.07, Math.min(0.92, 0.74 + h), 0.018, 0.8, 'mono')
    return s
  }

  if (formato === 'diapositiva') {
    if (r() < 0.7) await usa('grana', toolById('grana')!.propose(s, ctx))
    await scrivi(`${C.titolo} — ${nCap}/${C.capitoli.length}`, 0.07, 0.05, 0.016, 0.8, 'mono')
    const h = await scrivi(k.titolo, 0.07, 0.1, k.titolo.length > 22 ? 0.052 : 0.068, 0.84)
    let y = 0.12 + h + 0.03
    const punti = p.punti?.length ? p.punti : p.testo.split(/(?<=[.!?])\s+/).slice(0, 3).map(x => x.slice(0, 100))
    for (const x of punti.slice(0, 4)) { y += (await scrivi(`— ${x}`, 0.07, y, 0.026, 0.52, lettura)) + 0.018 }
    await segno(k.concetto, 0.76, 0.66, 0.42)
    if (k.concetto !== C.tema) await segno(C.tema, 0.88, 0.9, 0.12)
    if (p.fonti.length) await scrivi(`fonti: ${p.fonti.join('; ')}`, 0.07, 0.93, 0.014, 0.6, 'mono')
    return s
  }

  // pagina di libro
  const col = newCanvas(Math.round(s.W * 0.3), s.H), g = col.getContext('2d')!
  g.fillStyle = pick(r, [t.acc, t.ink]); g.globalAlpha = 0.08; g.fillRect(0, 0, col.width, col.height)
  s = withLayer(s, { ...fullLayer(s, lid(), 'campo', col), x: 0.85, y: 0.5, scale: s.H / M })
  await scrivi(`${C.titolo}`, 0.08, 0.045, 0.015, 0.5, 'mono')
  await scrivi(`${nCap}`, 0.92, 0.045, 0.015, 0.1, 'mono', ink, 'right')
  const h = await scrivi(`${nCap}. ${k.titolo}`, 0.08, 0.09, 0.045, 0.56)
  let corpo = p.testo
  let size = 0.021
  if (corpo.length > 900) size = 0.018
  if (corpo.length > 1500) corpo = corpo.slice(0, 1500).replace(/\s\S*$/, '') + ' […]'
  const top = 0.1 + h + 0.03
  const hb = await scrivi(corpo, 0.08, top, size, 0.56, lettura)
  if (p.versioni.length) await scrivi(`rivisto: prima diceva «${p.versioni[p.versioni.length - 1].testo.slice(0, 120)}…»`, 0.08, Math.min(0.86, top + hb + 0.02), 0.015, 0.56, 'mono', t.acc === t.bg ? ink : t.acc)
  if (p.contestato || p.tipo === 'obiezione') await scrivi(p.tipo === 'obiezione' ? 'obiezione' : 'contestato', 0.92, 0.12, 0.016, 0.2, 'mono', t.acc, 'right')
  await segno(k.concetto, 0.85, 0.32, 0.22)
  if (k.concetto !== C.tema) await segno(C.tema, 0.85, 0.62, 0.14)
  if (p.fonti.length) await scrivi(`Fonti: ${p.fonti.join('; ')}`, 0.08, 0.93, 0.013, 0.56, 'mono')
  return s
}
