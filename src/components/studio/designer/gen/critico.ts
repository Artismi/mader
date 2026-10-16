/**
 * Il critico: l'esame finale di ogni tavola. La maestra controlla mentre si
 * lavora; il critico guarda il risultato e accetta solo le tavole che
 * reggono: chiare, ordinate dove serve, con un'idea. Misura otto qualità,
 * corregge da solo i difetti che sa sistemare (allineamenti mancati di poco,
 * colori quasi uguali) e boccia il resto. Con molte candidate il motore tiene
 * solo le migliori; il critico con la vista (IA) guarda poi quelle promosse.
 */
import type { SceneEl } from '../types'
import { toOklch } from '../core/colore'
import { type G, textBox, check, corners, obbTouch } from './tools'
import { type Criterio, RUBRICA, SOGLIA, ECCELLENTE } from './rubrica'
import { affinita } from './affinita'
import { corpoMinimo } from '../core/scala'
export { corpoMinimo }

export type { Criterio } from './rubrica'
export interface Esame {
  /** 0-100 */
  voto: number
  /** 0-10 per criterio */
  criteri: Record<Criterio, number>
  difetti: string[]
  /** gesti riconosciuti (sperimentazione) */
  gesti: string[]
  correzioni: string[]
  promossa: boolean
  /** ossatura in breve (dove stanno titolo, foto, blocchi), per non proporre tavole gemelle */
  firma: string
  /** misure gratuite per l'imbuto prima del modello con visione (vedi imbuto.ts); non toccano il voto */
  misure: Misure
}
export interface Misure {
  /** testi che escono dalla tavola */
  fuori: number
  /** coppie di testi di gruppi diversi che si sovrappongono */
  sovrapposti: number
  /** margine minimo dei testi dal bordo, in multipli del margine base */
  margine: number
  /** quota della tavola dove succede qualcosa (0-1) */
  densita: number
  /** distanza del baricentro dei pesi visivi dal centro (0 = in equilibrio, 0,5 = tutto in un angolo) */
  squilibrio: number
  /** relazione tra le tinte vive */
  armonia: 'neutra' | 'mono' | 'analoga' | 'complementare' | 'triade' | 'libera'
  /** contrasto minimo tra i testi letti */
  contrastoMin: number
}

const PESI = Object.fromEntries((Object.keys(RUBRICA) as Criterio[]).map(k => [k, RUBRICA[k].peso])) as Record<Criterio, number>
export { SOGLIA, ECCELLENTE }

type Text = Extract<SceneEl, { kind: 'text' }>
type Box = { x: number; y: number; w: number; h: number }
const clamp = (v: number, a = 0, b = 10) => Math.max(a, Math.min(b, v))
/** Penalità che raddoppia a ogni ripetizione: 1 volta = base, 2 = base + 2·base, 3 = … (base·(2ⁿ−1)). */
const doppia = (n: number, base: number) => base * (2 ** n - 1)
const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const isText = (e: SceneEl): e is Text => e.kind === 'text' && !e.deco
const lab = (hex: string) => { const [L, C, h] = toOklch(hex); const r = (h * Math.PI) / 180; return [L, C * Math.cos(r), C * Math.sin(r)] as const }
const dist = (a: string, b: string) => { const p = lab(a), q = lab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) }

/** Riquadro di un elemento (per forme e foto). */
function boxOf(e: SceneEl): Box | null {
  switch (e.kind) {
    case 'rect': case 'image': case 'ornament': return { x: e.x, y: e.y, w: e.w, h: e.h }
    case 'circle': return { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r }
    case 'glyph': return { x: e.cx - e.size / 2, y: e.cy - e.size / 2, w: e.size, h: e.size }
    case 'seal': return { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r }
    case 'path': {
      const n = (e.d.match(/-?\d*\.?\d+/g) ?? []).map(Number)
      if (n.length < 2) return null
      const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1)
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
    }
    default: return null
  }
}
const fillOf = (e: SceneEl): string | null => {
  if ((e.kind === 'rect' || e.kind === 'circle' || e.kind === 'path') && typeof e.fill === 'string' && e.fill.startsWith('#') && e.fill.length === 7) return e.fill
  return null
}
/** Bordo sinistro dell'inchiostro, destro e centro di un testo orizzontale. */
function edges(t: Text) {
  const left = t.align === 'left' ? t.x : t.align === 'right' ? t.x + t.w - t.tw : t.x + (t.w - t.tw) / 2
  return { l: left, r: left + t.tw, c: left + t.tw / 2, anchor: t.align === 'left' ? 'l' : t.align === 'right' ? 'r' : 'c' } as const
}
const group = (name: string) => (name.includes('#') ? name.split('#')[0] : name)

export function esamina(g: G): Esame {
  const correzioni: string[] = []
  ripara(g, correzioni)
  const difetti: string[] = []
  const gesti: string[] = []
  const { W, H, u } = g
  const texts = g.els.filter(isText)
  const area = W * H

  /* ── leggibilità: margine sopra la soglia, non solo la soglia ── */
  const lett = g.letture ?? []
  const perTesto = lett.map(l => 0.5 * l.ok + 0.5 * Math.min(1, l.contrasto / (l.big ? 4.5 : 7)))
  let leggibilita = perTesto.length ? clamp(10 * (0.6 * (perTesto.reduce((a, b) => a + b, 0) / perTesto.length) + 0.4 * Math.min(...perTesto))) : 5
  const deboli = lett.filter((_, i) => perTesto[i] < 0.62)
  for (const l of deboli) difetti.push(`${l.name} si legge a fatica (contrasto ${l.contrasto.toFixed(1)})`)

  /* ── contenuto: tutto quello che il cliente ha scritto c'è ── */
  const scritto = norm(texts.map(t => t.lines.join(' ')).join(' ') + ' ' + g.els.filter(e => e.kind === 'arcText' || e.kind === 'seal').map(e => (e as { text: string }).text).join(' '))
  let contenuto = 10
  const c = g.c
  let vociPerse = 0
  if (!texts.some(t => t.name.startsWith('titolo')) && !scritto.includes(norm(c.title).split(' ').slice(0, 2).join(' '))) { contenuto -= 6; difetti.push('manca il titolo') }
  if (c.brand && !scritto.includes(norm(c.brand))) { contenuto -= 3; difetti.push('manca il brand') }
  if (c.cta && !scritto.includes(norm(c.cta).split(' ').slice(0, 2).join(' '))) { contenuto -= 1; difetti.push('manca l\'invito') }
  if (c.tipo && c.tipo !== 'copertina') for (const v of c.voci ?? []) {
    const k = norm(v.titolo ?? v.valore ?? '')
    if (k && !scritto.includes(k.split(' ').slice(0, 3).join(' '))) { vociPerse++; difetti.push(`manca la voce «${v.titolo ?? v.valore}»`) }
  }
  contenuto = clamp(contenuto - doppia(vociPerse, 3))

  /* ── gerarchia: un protagonista chiaro, pochi corpi ── */
  const titoli = texts.filter(t => t.name.startsWith('titolo'))
  const S1 = Math.max(0, ...titoli.map(t => t.size))
  const altri = texts.filter(t => !t.name.startsWith('titolo') && !/^(numero|valore|anno|domanda_segno|adesivo)/.test(t.name))
  const S2 = Math.max(1, ...altri.map(t => t.size))
  const rapp = S1 / S2
  let gerarchia = rapp >= 2.4 ? 10 : rapp >= 2 ? 9 : rapp >= 1.6 ? 7.5 : rapp >= 1.3 ? 5.5 : rapp >= 1.12 ? 3.5 : 2
  if (!S1) gerarchia = 3
  if (rapp < 1.3) difetti.push(`gerarchia debole: il titolo è solo ${rapp.toFixed(2)} volte il testo più grande`)
  // il titolo resta una frase: nessuna parola minuscola accanto alle altre, frammenti non dispersi
  if (titoli.length > 1) {
    const piccole = titoli.filter(t => t.size < S1 * 0.4)
    if (piccole.length) { gerarchia -= 3; difetti.push(`parole del titolo troppo piccole (${piccole.map(t => t.lines.join(' ')).join(', ')}): il titolo si spezza`) }
    const bs = titoli.map(t => ({ b: textBox(t), s: t.size })).sort((a, b) => a.b.y - b.b.y)
    const salti = bs.slice(1).filter((x, i) => { const gap = x.b.y - (bs[i].b.y + bs[i].b.h); return gap > 1.3 * Math.min(x.s, bs[i].s) && gap > 60 * u }).length
    if (salti) { gerarchia -= 2.5; difetti.push('frammenti del titolo troppo lontani: non si legge come una frase') }
  }
  const corpi: number[] = []
  for (const t of texts) if (!corpi.some(s => Math.abs(s - t.size) / s < 0.07)) corpi.push(t.size)
  if (corpi.length > 6) { gerarchia -= corpi.length - 6; difetti.push(`troppi corpi diversi (${corpi.length})`) }
  gerarchia = clamp(gerarchia)

  /* ── allineamento: gli allineamenti mancati di poco sono l'errore del dilettante ── */
  const quasi = nearMisses(g)
  let allineamento = 10 - doppia(quasi.length, 1.5)
  leggibilita = clamp(leggibilita - doppia(deboli.length, 0.8))
  for (const q of quasi.slice(0, 3)) difetti.push(`${q.name} quasi allineato (${Math.round(q.d / u)}u)`)
  const assi: number[] = []
  for (const t of texts) if (!(t.angle)) { const e = edges(t); const v = e[e.anchor]; if (!assi.some(a => Math.abs(a - v) < 3 * u)) assi.push(v) }
  const tolleranza = g.s.forma === 'decostruito' ? 7 : 4
  if (assi.length > tolleranza) { allineamento -= assi.length - tolleranza; difetti.push(`testi su troppi assi (${assi.length})`) }
  allineamento = clamp(allineamento)

  /* ── respiro: i testi non toccano i bordi dei loro riquadri ── */
  let respiro = 10, stretti = 0, vicini = 0
  const fondi = g.els.map((e, i) => ({ e, i, b: boxOf(e) })).filter(x => x.b && (x.e.kind === 'rect' || x.e.kind === 'image' || x.e.kind === 'circle') && fillOf(x.e) !== null || x.e.kind === 'image')
    // la foto dentro le lettere ha il riquadro del testo stesso: non è un fondo che lo contiene
    .filter(x => !(x.e.kind === 'image' && x.e.clipText))
  for (const t of texts) {
    if (t.angle) continue
    const tb = textBox(t), idx = g.els.indexOf(t)
    const cx = tb.x + tb.w / 2, cy = tb.y + tb.h / 2
    const cont = fondi.filter(f => f.i < idx && f.b && f.b.w < W * 0.98 && cx > f.b.x && cx < f.b.x + f.b.w && cy > f.b.y && cy < f.b.y + f.b.h)
      .sort((a, b) => a.b!.w * a.b!.h - b.b!.w * b.b!.h)[0]
    if (!cont?.b) continue
    const b = cont.b
    const dentro = tb.x >= b.x - 1 && tb.y >= b.y - 1 && tb.x + tb.w <= b.x + b.w + 1 && tb.y + tb.h <= b.y + b.h + 1
    if (!dentro) continue
    const lati = [b.x > 1 ? tb.x - b.x : Infinity, b.x + b.w < W - 1 ? b.x + b.w - tb.x - tb.w : Infinity, b.y > 1 ? tb.y - b.y : Infinity, b.y + b.h < H - 1 ? b.y + b.h - tb.y - tb.h : Infinity]
    const pad = Math.min(...lati)
    if (pad < 14 * u) { stretti++; difetti.push(`${t.name} stretto nel suo riquadro (${Math.round(pad / u)}u)`) }
  }
  // testi di gruppi diversi troppo vicini (il controllo ferma solo i contatti)
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    if (group(texts[i].name) === group(texts[j].name)) continue
    if (obbTouch(corners(texts[i], 5 * u), corners(texts[j], 5 * u)) && !/^(voce|testo|valore|anno|ora|prezzo|domanda|risposta|punto|numero)/.test(texts[i].name)) {
      vicini++; difetti.push(`${texts[i].name} e ${texts[j].name} troppo vicini`)
    }
  }
  // spazio morto: zone continue dove non succede niente (solo fondo o campi piatti grandi). Un solo
  // vuoto ampio può essere una scelta; ogni zona vuota in più raddoppia il peso della precedente
  const zone = spazioMorto(g)
  const sobrio = ['lusso', 'svizzero', 'editoriale'].includes(g.s.registro)
  const limite = sobrio ? 0.38 : 0.28
  const vuoti = zone.filter((z, i) => z > 0.1 && (i > 0 || z > limite))
  if (vuoti.length) difetti.push(`${vuoti.length === 1 ? 'un vuoto' : `${vuoti.length} vuoti`} non progettati (${vuoti.map(z => Math.round(z * 100) + '%').join(', ')} della tavola senza niente)`)
  // ogni ripetizione dello stesso difetto pesa il doppio della precedente
  respiro = clamp(respiro - doppia(stretti, 2) - doppia(vicini, 1) - doppia(vuoti.length, 2.5))

  /* ── colore: palette compatta, niente colori quasi uguali ── */
  let colore = 10, simili = 0
  const campi = g.els.map(e => ({ f: fillOf(e), b: boxOf(e), e })).filter(x => x.f && x.b && x.b.w * x.b.h > area * 0.015) as { f: string; b: Box; e: SceneEl }[]
  const tinte = [g.P.bg, ...campi.map(x => x.f), ...texts.map(t => t.color).filter(c => c.startsWith('#') && c.length === 7)]
  const distinti: string[] = []
  for (const t of tinte) if (!distinti.some(d => dist(d, t) < 0.035)) distinti.push(t)
  for (let i = 0; i < distinti.length; i++) for (let j = i + 1; j < distinti.length; j++) {
    const d = dist(distinti[i], distinti[j])
    if (d > 0.006 && d < 0.05) { simili++; difetti.push(`colori quasi uguali ${distinti[i]} e ${distinti[j]}`) }
  }
  const vivi: number[] = []
  for (const t of distinti) { const [, C, h] = toOklch(t); if (C > 0.07 && !vivi.some(v => Math.abs(((v - h + 540) % 360) - 180) < 30)) vivi.push(h) }
  const maxVivi = g.s.registro === 'pop' || g.s.registro === 'infantile' ? 4 : 3
  if (vivi.length > maxVivi) { colore -= 2 * (vivi.length - maxVivi); difetti.push(`troppe tinte vive (${vivi.length})`) }
  if (distinti.length > 7) { colore -= distinti.length - 7; difetti.push(`palette dispersa (${distinti.length} colori)`) }
  // campi di colore muti: blocchi pieni dove non succede niente
  const pieni = (b: Box) => g.els.some(e => (isText(e) || e.kind === 'image' || e.kind === 'ornament' || e.kind === 'glyph') && (() => { const x = isText(e) ? textBox(e) : boxOf(e)!; return x.x < b.x + b.w && x.x + x.w > b.x && x.y < b.y + b.h && x.y + x.h > b.y })())
  const muti = g.els.filter(e => e.kind === 'rect' && e.name === 'campo' && !pieni(boxOf(e)!)).length
  if (muti) { colore -= doppia(muti, 1.2); difetti.push(`${muti === 1 ? 'un campo' : `${muti} campi`} di colore senza funzione`) }
  // una situazione cromatica ha un punto d'attenzione: un campo d'accento o una foto che si stacca dal fondo
  const accento = campi.some(x => x.b.w * x.b.h > area * 0.03 && dist(x.f, g.P.bg) > 0.12) || g.els.some(e => e.kind === 'image')
  if (!accento) { colore -= 2.5; difetti.push('colore senza un punto d\'attenzione: tutto sullo stesso piano') }
  if (distinti.length <= 2) colore -= 1.5
  colore = clamp(colore - doppia(simili, 1.5))

  /* ── decoro: quanto basta per il registro, mai rumore ── */
  const deco = g.els.filter(e => e.kind === 'ornament' || e.kind === 'glyph' || e.kind === 'seal' || (e.kind === 'path' && !/^(foto|velo)/.test(e.name)) || e.kind === 'line' || (e.kind === 'text' && e.deco) || (e.kind === 'circle' && !/^(foto|ponte)/.test(e.name)))
  const espressivo = ['pop', 'infantile', 'avanguardia', 'notte', 'retro', 'sportivo', 'artigianale'].includes(g.s.registro)
  const tipiDeco = new Set(deco.map(e => e.kind)).size
  let decoro = tipiDeco >= 2 ? 10 : tipiDeco === 1 ? 8 : espressivo ? 4 : 7.5
  if (espressivo && deco.length === 0) { decoro = 3; difetti.push('nessun segno: il registro chiede più carattere') }
  else if (!espressivo && deco.length > 18) { decoro = 6; difetti.push('troppi segni per un registro sobrio') }
  else if (deco.length > 40) { decoro = 6; difetti.push('decorazione rumorosa') }
  // segni isolati: ornamenti in una zona a sé, che non toccano testi né foto (riempitivi da catalogo)
  // le icone della specifica (emblema, fregio) sono ancorate ai testi per costruzione: non sono riempitivi
  const isolati = g.els.filter(e => (e.kind === 'ornament' || (e.kind === 'glyph' && !/^(icona|fregio)$/.test(e.name)) || (e.kind === 'path' && /^(segno|blob|righe|ornamento|glifo)$/.test(e.name))) && (() => {
    const b = boxOf(e); if (!b) return false
    return !g.els.some(x => (isText(x) || x.kind === 'image') && (() => { const y = isText(x) ? textBox(x) : boxOf(x)!; return y.x < b.x + b.w && y.x + y.w > b.x && y.y < b.y + b.h && y.y + y.h > b.y })())
  })()).length
  if (isolati) { decoro -= doppia(isolati, 2); difetti.push(`${isolati === 1 ? 'un segno isolato' : `${isolati} segni isolati`}: riempitivo che non dialoga con il contenuto`) }
  decoro = clamp(decoro)

  /* ── sperimentazione: gesti da grafico, quanti ne chiede l'energia ── */
  const non = (e: SceneEl) => !/^(grana|fondo|tavola)$/.test(e.name)
  if (g.els.some(e => (e.kind === 'text' && !e.deco && e.angle) || (e.kind === 'rect' && e.angle && Math.abs(e.angle) > 1))) gesti.push('rotazione')
  if (g.els.some(e => { const b = boxOf(e); return non(e) && b && (e.kind === 'image' || fillOf(e)) && b.w * b.h < area * 0.95 && b.w * b.h > area * 0.04 && (b.x <= 1 || b.y <= 1 || b.x + b.w >= W - 1 || b.y + b.h >= H - 1) })) gesti.push('al vivo')
  if (g.els.some(e => { const b = (e as { blend?: string }).blend; const op = (e as { opacity?: number }).opacity ?? 1; return b && b !== 'source-over' && op > 0.4 && !/grana|carta|trama|luce|fondo|finitura|velo/.test(e.name) && (boxOf(e)?.w ?? 0) * (boxOf(e)?.h ?? 0) > area * 0.02 })) gesti.push('sovrastampa')
  if (g.els.some(e => e.kind === 'image' && (e.fx?.length || e.look))) gesti.push('foto trattata')
  if (g.els.some(e => e.kind === 'image' && (e.mask || e.clipText || (e.shape && e.shape !== 'rect')))) gesti.push('foto in forma')
  if (S1 / H > 0.12) gesti.push('scala')
  if (S1 / H > 0.2) gesti.push('tipo gigante')
  if (g.els.some(e => e.kind === 'path' && /segno|scarabocchio|filo|cerchiato|freccia/.test(e.name) && e.stroke)) gesti.push('segno a mano')
  if (g.els.some(e => e.kind === 'text' && e.deco)) gesti.push('tipografia decorativa')
  if (g.els.some(e => e.kind === 'ornament' || e.kind === 'seal' || e.kind === 'arcText')) gesti.push('ornamento')
  if (sconfina(g, texts)) gesti.push('sconfinamento')
  const attesi = 2.5 + 4 * g.k.energia
  let sperimentazione = gesti.length === 0 ? 2 : clamp(10 * Math.min(1, gesti.length / attesi))
  if (gesti.length < attesi * 0.5) difetti.push(`pochi gesti (${gesti.length}): composizione ordinata ma senza idea`)
  sperimentazione = clamp(sperimentazione)

  /* ── corpo minimo: su telefono la tavola si vede larga circa 390 punti; descrizioni e note restano leggibili ── */
  const piccoli = texts.filter(t => !t.name.startsWith('titolo')).map(t => ({ t, min: corpoMinimo(t.name, g.format, W) })).filter(x => x.t.size < x.min)
  const sottoCorpo = piccoli.reduce((a, x) => a + Math.min(8, 12 * (1 - x.t.size / x.min)), 0)
  if (piccoli.length) {
    const p0 = piccoli.sort((a, b) => a.t.size / a.min - b.t.size / b.min)[0]
    difetti.push(`${piccoli.length === 1 ? p0.t.name : `${piccoli.length} testi`} troppo piccolo per il telefono (${Math.round(p0.t.size)}px, minimo ${Math.round(p0.min)}px)`)
  }

  /* ── stile e soggetto: un archetipo fuori luogo per il settore pesa forte (affinita.ts) ── */
  const aff = affinita(g.c, g.k.sistema)
  if (aff !== 'ok') difetti.push(aff === 'esclusa' ? `stile estraneo al soggetto (${g.k.sistema})` : `stile lontano dal soggetto (${g.k.sistema})`)

  const criteri: Record<Criterio, number> = { leggibilita, contenuto, gerarchia, allineamento, respiro, colore, decoro, sperimentazione }
  // voto severo: la media pesata passa per una curva (tutto "corretto" non basta per l'eccellenza),
  // ogni difetto toglie punti, un criterio debole mette un tetto
  const media = (Object.keys(PESI) as Criterio[]).reduce((a, k) => a + PESI[k] * criteri[k], 0)
  // ogni difetto toglie punti secondo la gravità (GRAVITA); i vuoti in proporzione alla loro ampiezza
  let voto = 100 * (media / 10) ** 2.4 - pesoDifetti(difetti) - sottoCorpo - vuoti.reduce((a, z) => a + 4 + 40 * Math.max(0, z - 0.1), 0)
  const tetti: [boolean, number][] = [
    [contenuto < 8, 50], [leggibilita < 6, 50], [Math.min(...Object.values(criteri)) < 4, 58],
    [sperimentazione < 6, 66], [gerarchia < 5.5, 64], [Math.min(...Object.values(criteri)) < 6, 70],
  ]
  for (const [cond, max] of tetti) if (cond) voto = Math.min(voto, max)
  // blocchi: difetti che da soli non lasciano consegnare la tavola
  const blocca = (zone[0] ?? 0) > 0.4 || (!!c.cta && difetti.includes("manca l'invito"))
  if (blocca) voto = Math.min(voto, SOGLIA - 1)
  voto = Math.max(0, Math.round(voto))
  const promossa = voto >= SOGLIA
  const misure: Misure = { ...misureLibere(g, texts), densita: 1 - zone.reduce((a, z) => a + z, 0), armonia: armonia(vivi), contrastoMin: lett.length ? Math.min(...lett.map(l => l.contrasto)) : 21 }
  return { voto, criteri, difetti, gesti, correzioni, promossa, firma: firma(g), misure }
}

/** Quanto pesa ogni nota del critico sul voto (punti su 100). La prima regola che combacia vale. */
const GRAVITA: [RegExp, number][] = [
  [/^manca il titolo/, 30], [/^manca il brand/, 12], [/^manca l'invito/, 10], [/^manca la voce/, 8],
  [/si legge a fatica/, 8], [/troppo piccolo per il telefono/, 6],
  [/^gerarchia debole/, 6], [/parole del titolo troppo piccole/, 6], [/frammenti del titolo/, 5], [/troppi corpi/, 3],
  [/quasi allineato/, 3], [/troppi assi/, 3], [/stretto nel suo riquadro/, 3], [/troppo vicini/, 3],
  [/colori quasi uguali/, 3], [/troppe tinte/, 3], [/palette dispersa/, 3], [/di colore senza funzione/, 3], [/senza un punto d'attenzione/, 4],
  [/nessun segno/, 4], [/troppi segni/, 3], [/decorazione rumorosa/, 4], [/segn[oi] isolat/, 3], [/pochi gesti/, 4],
  [/stile lontano dal soggetto/, 12], [/stile estraneo al soggetto/, 40],
  [/non progettat/, 0], // i vuoti pesano a parte, in proporzione all'ampiezza
]
export function pesoDifetti(difetti: string[]) {
  return difetti.reduce((a, d) => a + (GRAVITA.find(([re]) => re.test(d))?.[1] ?? 2), 0)
}

/** Testi fuori tavola o sovrapposti, margine minimo, equilibrio dei pesi visivi. */
function misureLibere(g: G, texts: Text[]) {
  const { W, H } = g
  const boxes = texts.map(textBox)
  const fuori = boxes.filter(b => b.x < -1 || b.y < -1 || b.x + b.w > W + 1 || b.y + b.h > H + 1).length
  let sovrapposti = 0
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++)
    if (group(texts[i].name) !== group(texts[j].name) && obbTouch(corners(texts[i], 0), corners(texts[j], 0))) sovrapposti++
  const margine = boxes.length ? Math.min(...boxes.map(b => Math.min(b.x, b.y, W - b.x - b.w, H - b.y - b.h))) / Math.max(1, g.m) : 1
  // peso visivo: area per stacco dal fondo; i fondi pieni non pesano
  let m = 0, mx = 0, my = 0
  const pesa = (b: Box, k: number) => { const a = Math.max(0, b.w) * Math.max(0, b.h) * k; m += a; mx += a * (b.x + b.w / 2); my += a * (b.y + b.h / 2) }
  for (const e of g.els) {
    if (isText(e)) { pesa(textBox(e), 0.6 + dist(e.color.startsWith('#') && e.color.length === 7 ? e.color : '#000000', g.P.bg)); continue }
    const b = boxOf(e)
    if (!b || b.w * b.h > W * H * 0.9 || /grana|fondo|carta|tavola/.test(e.name)) continue
    if (e.kind === 'image') pesa(b, 0.8)
    else { const f = fillOf(e); if (f) pesa(b, Math.min(1, dist(f, g.P.bg) * 3)) }
  }
  const squilibrio = m ? Math.hypot(mx / m / W - 0.5, my / m / H - 0.5) : 0
  return { fuori, sovrapposti, margine, squilibrio }
}

/** Relazione tra le tinte vive (gradi oklch). */
function armonia(h: number[]): Misure['armonia'] {
  if (!h.length) return 'neutra'
  if (h.length === 1) return 'mono'
  const d = (a: number, b: number) => { const x = Math.abs(a - b) % 360; return x > 180 ? 360 - x : x }
  const coppie = h.flatMap((a, i) => h.slice(i + 1).map(b => d(a, b)))
  if (coppie.every(x => x <= 60)) return 'analoga'
  if (h.length === 2 && coppie[0] >= 150) return 'complementare'
  if (h.length === 3 && coppie.every(x => x >= 90 && x <= 150)) return 'triade'
  return 'libera'
}

/** Zone continue vuote (griglia 16×16), come frazioni della tavola, dalla più grande. */
function spazioMorto(g: G): number[] {
  const N = 16, cw = g.W / N, ch = g.H / N, area = g.W * g.H
  const pieno = Array.from({ length: N * N }, () => false)
  for (const e of g.els) {
    let b: Box | null = null
    if (isText(e)) b = textBox(e)
    else if (e.kind === 'image' || e.kind === 'ornament' || e.kind === 'glyph' || e.kind === 'seal' || e.kind === 'arcText' || e.kind === 'line') b = e.kind === 'line' ? { x: Math.min(e.x1, e.x2), y: Math.min(e.y1, e.y2), w: Math.abs(e.x2 - e.x1) + 1, h: Math.abs(e.y2 - e.y1) + 1 } : e.kind === 'arcText' ? { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r } : boxOf(e)
    else if ((e.kind === 'rect' || e.kind === 'circle' || e.kind === 'path') && !/grana|fondo|carta/.test(e.name)) {
      const x = boxOf(e)
      // i campi piatti grandi sono fondo; le forme piccole e i tratti sono segni
      if (x && (x.w * x.h < area * 0.2 || (e as { stroke?: string }).stroke || (e as { fx?: unknown[] }).fx?.length)) b = x
    }
    if (!b) continue
    for (let i = Math.max(0, Math.floor(b.x / cw)); i <= Math.min(N - 1, Math.floor((b.x + b.w) / cw)); i++)
      for (let j = Math.max(0, Math.floor(b.y / ch)); j <= Math.min(N - 1, Math.floor((b.y + b.h) / ch)); j++) pieno[j * N + i] = true
  }
  const visto = new Set<number>()
  const zone: number[] = []
  for (let k = 0; k < N * N; k++) {
    if (pieno[k] || visto.has(k)) continue
    let n = 0
    const coda = [k]; visto.add(k)
    while (coda.length) {
      const c = coda.pop()!; n++
      const i = c % N, j = Math.floor(c / N)
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj, nk = nj * N + ni
        if (ni >= 0 && nj >= 0 && ni < N && nj < N && !pieno[nk] && !visto.has(nk)) { visto.add(nk); coda.push(nk) }
      }
    }
    zone.push(n / (N * N))
  }
  return zone.sort((a, b) => b - a)
}

/** Un testo che attraversa il bordo di una foto o di un campo: la composizione si lega, non è a scomparti. */
function sconfina(g: G, texts: Text[]) {
  const blocchi = g.els.map(boxOf).filter((b, i) => b && (g.els[i].kind === 'image' || fillOf(g.els[i])) && b.w * b.h < g.W * g.H * 0.9 && b.w * b.h > g.W * g.H * 0.03) as Box[]
  return texts.some(t => {
    const tb = textBox(t)
    return blocchi.some(b => {
      const inter = !(tb.x > b.x + b.w || tb.x + tb.w < b.x || tb.y > b.y + b.h || tb.y + tb.h < b.y)
      const dentro = tb.x >= b.x && tb.y >= b.y && tb.x + tb.w <= b.x + b.w && tb.y + tb.h <= b.y + b.h
      return inter && !dentro
    })
  })
}

/** Bordi che mancano un allineamento di poco: tra 2u e 16u da un bordo di un altro elemento vicino. */
function nearMisses(g: G) {
  const { u, W, H } = g
  const texts = g.els.filter(isText).filter(t => !t.angle)
  const refs: { v: number; y0: number; y1: number; owner: SceneEl }[] = []
  for (const e of g.els) {
    if (isText(e) && !e.angle) { const ed = edges(e); refs.push({ v: ed[ed.anchor], y0: e.y, y1: e.y + e.h, owner: e }); continue }
    if (e.kind !== 'rect' && e.kind !== 'image') continue
    const b = boxOf(e)!
    if (b.w * b.h < W * H * 0.01 || b.w >= W * 0.98) continue
    if (b.x > 1) refs.push({ v: b.x, y0: b.y, y1: b.y + b.h, owner: e })
    if (b.x + b.w < W - 1) refs.push({ v: b.x + b.w, y0: b.y, y1: b.y + b.h, owner: e })
  }
  const out: { name: string; d: number; t: Text; to: number }[] = []
  for (const t of texts) {
    const ed = edges(t), v = ed[ed.anchor]
    let best: { d: number; to: number } | null = null
    for (const r of refs) {
      if (r.owner === t || (isText(r.owner) && group(r.owner.name) === group(t.name))) continue
      // conta solo ciò che sta nella stessa colonna di lettura (vicino in verticale)
      const gapY = Math.max(0, r.y0 - (t.y + t.h), t.y - r.y1)
      if (gapY > H * 0.3) continue
      const d = r.v - v
      if (Math.abs(d) > 2 * u && Math.abs(d) < 16 * u && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, to: r.v }
      if (Math.abs(d) <= 2 * u) { best = null; break }
    }
    if (best) out.push({ name: t.name, d: Math.abs(best.d), t, to: best.to })
  }
  return out
}

/** Correzioni che il critico fa da sé: allinea i testi mancati di poco, unifica i colori quasi uguali. */
function ripara(g: G, log: string[]) {
  const prima = g.els.map(e => ({ ...e })) as SceneEl[]
  let cambiato = false
  for (const q of nearMisses(g)) {
    const ed = edges(q.t)
    const dx = q.to - ed[ed.anchor]
    q.t.x += dx
    cambiato = true
    log.push(`allineato ${q.name} (${dx > 0 ? '+' : ''}${Math.round(dx / g.u)}u)`)
  }
  const campi = g.els.filter(e => fillOf(e)).map(e => ({ e, f: fillOf(e)!, a: (boxOf(e)?.w ?? 0) * (boxOf(e)?.h ?? 0) }))
  for (const x of campi) {
    const simile = [g.P.bg, ...campi.filter(y => y.a > x.a).map(y => y.f)].find(f => { const d = dist(f, x.f); return d > 0.006 && d < 0.05 })
    if (simile) { (x.e as { fill: string }).fill = simile; cambiato = true; log.push(`unificato ${x.f} → ${simile}`) }
  }
  // se una correzione crea un contatto o esce dai margini, si torna indietro
  if (cambiato && !check(g)) { g.els = prima; log.length = 0 }
}

/** Ossatura in breve: posizione di titolo, foto e blocchi pieni su una griglia 4×4. */
function firma(g: G) {
  const q = (b: Box) => [b.x / g.W, b.y / g.H, (b.x + b.w) / g.W, (b.y + b.h) / g.H].map(v => Math.max(0, Math.min(3, Math.floor(v * 4 - 1e-6)))).join('')
  const parti: string[] = []
  const tit = g.els.filter(e => isText(e) && e.name.startsWith('titolo')) as Text[]
  if (tit.length) {
    const bs = tit.map(textBox)
    const x0 = Math.min(...bs.map(b => b.x)), y0 = Math.min(...bs.map(b => b.y))
    parti.push('T' + q({ x: x0, y: y0, w: Math.max(...bs.map(b => b.x + b.w)) - x0, h: Math.max(...bs.map(b => b.y + b.h)) - y0 }))
  }
  for (const e of g.els) {
    const b = boxOf(e)
    if (!b || b.w * b.h < g.W * g.H * 0.06 || b.w * b.h > g.W * g.H * 0.95) continue
    if (e.kind === 'image') parti.push('F' + q(b))
    else if (fillOf(e)) parti.push('C' + q(b))
  }
  return [...new Set(parti)].sort().join('|')
}
