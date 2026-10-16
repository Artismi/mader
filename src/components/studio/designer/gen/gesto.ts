/**
 * Il gesto dell'idea su qualunque archetipo (C2 esteso): uno strato che lavora
 * sulla tavola già composta, prima dello specchio e dei controlli. Le ricette a
 * mattoni (eco, costruttivo, scontrino) eseguono il gesto da sé: qui ricevono
 * solo il filtro degli ornamenti. Per gli altri archetipi:
 * - ornamenti: via quelli che l'idea non motiva;
 * - taglio: la foto ingrandita dentro il suo riquadro (taglio radicale);
 * - ripetizione: il titolo ripetuto a contorno sopra e sotto, sempre più tenue;
 * - parola-immagine: la parola gigante tagliata dai bordi, dietro a tutto;
 * - spezzato: il titolo dietro e davanti alla figura, o una forma a incastro.
 * Scala e vuoto passano dai poli dei regolatori (e dal critico, per il vuoto).
 */
import type { SceneEl } from '../types'
import { type G, readable, mix, contrast, sizeForWidth, keyword, up } from './tools'
import { lineWidth } from '../text'
import { ORNAMENTI } from './carattere'
import { INTRECCI } from './mattoni/intreccio'
import type { Piano } from './mattoni/tipi'

type Text = Extract<SceneEl, { kind: 'text' }>
/** gli archetipi che eseguono il gesto con i loro mattoni */
const A_MATTONI = new Set(['eco', 'costruttivo', 'scontrino', 'ibrido'])
const titolo = (g: G) => g.els.filter((e): e is Text => e.kind === 'text' && !e.deco && /^titolo/.test(e.name)).sort((a, b) => b.size - a.size)[0]
const pianoVuoto = (): Piano => ({ offre: new Set(), ancore: {}, info: [], misuraTitolo: () => null })

/** Applica un mattone d'intreccio per id; lo segna tra i mattoni della tavola se riesce. */
export function intreccia(g: G, id: string) {
  const m = INTRECCI.find(x => x.id === id)
  if (!m || !m.fai(g, pianoVuoto(), {})) return false
  ;(g.segni ??= []).push(`intreccio:${id}`)
  return true
}

export function gesto(g: G) {
  const idea = g.k.idea
  if (!idea) return
  // ornamenti senza motivo: fuori (i testi del messaggio non sono mai ornamenti)
  g.els = g.els.filter(e => {
    if (e.kind === 'text' && !e.deco) return true
    const o = ORNAMENTI.find(([re]) => re.test(e.name))
    return !o || idea.motivi.includes(o[1])
  })
  if (A_MATTONI.has(g.k.sistema)) return
  const t = titolo(g)
  switch (idea.gesto) {
    case 'taglio': {
      // la foto più grande, ingrandita del doppio dentro il suo riquadro: resta il dettaglio
      const f = g.els.filter((e): e is Extract<SceneEl, { kind: 'image' }> => e.kind === 'image' && !e.clipText).sort((a, b) => b.w * b.h - a.w * a.h)[0]
      if (f) { const v = f.view ?? { x: f.x, y: f.y, w: f.w, h: f.h }; f.view = { x: v.x - v.w * 0.55, y: v.y - v.h * 0.4, w: v.w * 2.1, h: v.h * 2.1 }; (g.segni ??= []).push('gesto:taglio') }
      break
    }
    case 'ripetizione': {
      if (!t || t.angle) break
      const copie: Text[] = []
      const passo = t.lineHeight * t.size * Math.max(1, t.lines.length) * 0.92
      for (const [i, d] of [-1, 1, -2, 2, -3, 3].entries()) {
        const y = t.y + d * passo
        if (y + t.h < 0 || y > g.H) continue
        copie.push({ ...t, name: 'eco_titolo', y, hollow: true, stroke: t.color, sw: Math.max(1.5, t.size * 0.014), deco: true, opacity: 0.42 - Math.floor(i / 2) * 0.12, chars: undefined })
      }
      if (copie.length) { g.els.splice(g.els.indexOf(t), 0, ...copie); (g.segni ??= []).push('gesto:ripetizione') }
      break
    }
    case 'parola-immagine': {
      // la parola chiave gigante, tagliata dai due lati, in una tinta vicina al fondo: dietro a tutto
      const parola = up(idea.parola?.trim() || keyword(g), true)
      const size = Math.min(sizeForWidth(parola, g.s.impact, g.W * 1.3, -0.03), g.H * 0.62)
      if (size < 160 * g.u) break
      const w = lineWidth(parola, g.s.impact, size, -0.03)
      const tinta = mix(g.P.bg, readable(g.P.bg, [g.P.acc, g.P.acc2, g.P.fg], 2), 0.42)
      if (contrast(tinta, g.P.bg) < 1.12) break
      const y = t ? Math.max(-size * 0.2, Math.min(g.H - size * 0.8, t.y + t.h / 2 - size * 0.55)) : (g.H - size) / 2
      // dietro a tutto: subito dopo i fondi pieni a tutta tavola
      const at = g.els.findIndex(e => !(e.kind === 'rect' && e.w >= g.W * 0.95 && e.h >= g.H * 0.95))
      g.els.splice(Math.max(0, at), 0, { kind: 'text', name: 'parola', x: (g.W - w) / 2, y, w, h: size, tw: w, lines: [parola], font: g.s.impact, size, color: tinta, align: 'left', lineHeight: 0.9, tracking: -0.03, deco: true })
      ;(g.segni ??= []).push('gesto:parola-immagine')
      break
    }
    case 'spezzato':
      if (!intreccia(g, 'davanti-dietro')) intreccia(g, 'incastro')
      break
  }
}
