/**
 * Controlli della maestra sulle scritture a mano del canvas (createDesignBoards,
 * updateCanvasElements) e verifica delle scritture dichiarate. Funzioni pure:
 * le usano il server (avvisi al modello) e la chat (le tavole corrette sono
 * quelle che lo Studio disegna davvero).
 *
 *   - elementi dentro la tavola: testi e foto spostati dentro, forme rifilate;
 *   - livelli: fondo pieno sotto, foto grande subito sopra, testo sopra a tutto;
 *   - nessun riquadro opaco sopra la maggior parte di una foto importante;
 *   - al turno dopo, le scritture dichiarate si cercano nello stato vero del canvas.
 */

export interface ElementoTavola {
  id?: string
  type: string
  x?: number; y?: number; w?: number; h?: number
  x1?: number; y1?: number; x2?: number; y2?: number
  originX?: 'left' | 'center' | 'right'
  originY?: 'top' | 'center' | 'bottom'
  alignX?: string; alignY?: string
  opacity?: number
  zIndex?: number
  text?: string
  [k: string]: unknown
}
export interface TavolaManuale { name?: string; width?: number; height?: number; elements?: ElementoTavola[]; [k: string]: unknown }

// nuove grafiche: un oggetto grafico e un verbo che chiede di farlo
const GRAFICA = /\b(grafic[ahe]+|post|volantin[oi]|locandin[ae]|poster|flyer|presentazion[ei]|slide|carosell[oi]|copertin[ae]|banner|manifest[oi]|stori[ae]|deck|visual|cartolin[ae]|invit[oi])\b/i
const FARE = /\b(crea|creami|fai|fammi|genera|progetta|disegna|prepara|realizza|componi|ricrea|rifai|impagina|nuov[aoie]|vorrei|voglio|serve|servono)\b/i

/** La richiesta è una grafica nuova (post, volantino, presentazione…), non un ritocco? */
export function isDesignRequest(text: string): boolean {
  return GRAFICA.test(text) && FARE.test(text)
}

const r = Math.round
const lato = (v: number | undefined) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** Riquadro dell'elemento in coordinate della tavola, se misurabile. */
function riquadro(e: ElementoTavola): { l: number; t: number; w: number; h: number } | undefined {
  const w = lato(e.w), h = lato(e.h), x = lato(e.x), y = lato(e.y)
  if (w === undefined || h === undefined || x === undefined || y === undefined) return undefined
  const l = e.originX === 'center' ? x - w / 2 : e.originX === 'right' ? x - w : x
  const t = e.originY === 'center' ? y - h / 2 : e.originY === 'bottom' ? y - h : y
  return { l, t, w, h }
}
function ponti(e: ElementoTavola, q: { l: number; t: number; w: number; h: number }) {
  e.w = r(q.w); e.h = r(q.h)
  e.x = r(e.originX === 'center' ? q.l + q.w / 2 : e.originX === 'right' ? q.l + q.w : q.l)
  e.y = r(e.originY === 'center' ? q.t + q.h / 2 : e.originY === 'bottom' ? q.t + q.h : q.t)
}
const sovrapposta = (a: { l: number; t: number; w: number; h: number }, b: { l: number; t: number; w: number; h: number }) =>
  Math.max(0, Math.min(a.l + a.w, b.l + b.w) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.t + a.h, b.t + b.h) - Math.max(a.t, b.t))

const FORME = new Set(['rect', 'circle', 'path', 'procedural'])

/**
 * Corregge le tavole composte a mano. Restituisce copie (l'input non cambia) e
 * gli avvisi per il modello. Deterministica: server e chat ottengono lo stesso risultato.
 */
export function controllaTavole(boards: TavolaManuale[]): { boards: TavolaManuale[]; avvisi: string[] } {
  const avvisi: string[] = []
  const out = (boards ?? []).map((b, bi) => {
    const W = lato(b.width) ?? 1080, H = lato(b.height) ?? 1080, area = W * H
    const nome = b.name ?? `tavola ${bi + 1}`
    const margine = r(Math.min(W, H) * 0.04)
    const els = (b.elements ?? []).map(e => ({ ...e }))

    // 1. dentro la tavola
    for (const e of els) {
      const id = e.id ?? e.type
      if (e.type === 'line') {
        for (const k of ['x1', 'x2'] as const) if (typeof e[k] === 'number') e[k] = Math.max(0, Math.min(W, e[k]!))
        for (const k of ['y1', 'y2'] as const) if (typeof e[k] === 'number') e[k] = Math.max(0, Math.min(H, e[k]!))
        continue
      }
      const q = riquadro(e)
      if (!q || e.alignX || e.alignY) continue
      const dentro = q.l >= -1 && q.t >= -1 && q.l + q.w <= W + 1 && q.t + q.h <= H + 1
      if (dentro) continue
      const visibile = sovrapposta(q, { l: 0, t: 0, w: W, h: H }) / Math.max(1, q.w * q.h)
      if (e.type === 'image' && q.w >= W * 0.95 && q.h >= H * 0.95) continue // foto al vivo: la tavola la rifila
      if (e.type === 'text' || e.type === 'image' || visibile < 0.05) {
        // si sposta dentro (testo anche nel margine), stringendo solo se più grande della tavola
        const m = e.type === 'text' ? margine : 0
        const w = Math.min(q.w, W - 2 * m), h = Math.min(q.h, H - 2 * m)
        const n = { l: Math.max(m, Math.min(q.l, W - m - w)), t: Math.max(m, Math.min(q.t, H - m - h)), w, h }
        ponti(e, n)
        avvisi.push(`${nome}: «${id}» usciva dalla tavola, spostato dentro a x=${e.x}, y=${e.y}`)
      } else {
        const l = Math.max(0, q.l), t = Math.max(0, q.t)
        ponti(e, { l, t, w: Math.min(W, q.l + q.w) - l, h: Math.min(H, q.t + q.h) - t })
        avvisi.push(`${nome}: «${id}» usciva dalla tavola, rifilato a ${e.w}×${e.h}`)
      }
    }

    // 2. livelli: fondo pieno < foto grande < resto < testo (dentro la classe resta l'ordine del modello)
    const classe = (e: ElementoTavola) => {
      const q = riquadro(e)
      const a = q ? (q.w * q.h) / area : 0
      if (FORME.has(e.type) && a >= 0.9) return 0
      if (e.type === 'image' && a >= 0.4) return 1
      return e.type === 'text' ? 3 : 2
    }
    const ordinati = els.map((e, i) => ({ e, i, z: lato(e.zIndex) ?? 0, c: classe(e) }))
    const primaZ = [...ordinati].sort((a, c) => a.z - c.z || a.i - c.i)
    const dopo = [...ordinati].sort((a, c) => a.c - c.c || a.z - c.z || a.i - c.i)
    const spostati = dopo.filter((x, k) => primaZ[k] !== x && (x.c === 3 || x.c <= 1))
    if (spostati.length) avvisi.push(`${nome}: livelli riordinati (fondo sotto, foto grande sopra il fondo, testi sopra a tutto): ${spostati.slice(0, 4).map(x => x.e.id ?? x.e.type).join(', ')}`)
    dopo.forEach((x, k) => { x.e.zIndex = k })

    // 3. nessun riquadro opaco sopra la maggior parte di una foto importante
    for (const f of dopo.filter(x => x.e.type === 'image')) {
      const qf = riquadro(f.e)
      if (!qf || (qf.w * qf.h) / area < 0.15) continue
      for (const s of dopo.filter(x => x.c === 2 && FORME.has(x.e.type) && (x.e.zIndex ?? 0) > (f.e.zIndex ?? 0))) {
        const qs = riquadro(s.e)
        if (!qs || (s.e.opacity ?? 1) < 0.85) continue
        if (sovrapposta(qf, qs) / (qf.w * qf.h) >= 0.4) {
          s.e.opacity = 0.45
          avvisi.push(`${nome}: «${s.e.id ?? s.e.type}» copriva la foto «${f.e.id ?? 'immagine'}»: opacità portata a 0.45 (per un fondo al testo usa una fascia o un velo, non un riquadro pieno sulla foto)`)
        }
      }
    }
    return { ...b, elements: dopo.map(x => x.e) }
  })
  return { boards: out, avvisi }
}

/* ── verifica delle scritture dichiarate ─────────────────────────────── */

export interface ScritturaCanvas { strumento: string; input: unknown }

/** Cosa delle scritture del turno precedente non risulta nello stato vero del canvas. */
export function verificaCanvas(scritture: ScritturaCanvas[], snapshot?: string): string[] {
  const snap = snapshot ?? ''
  const vuoto = !snap.trim() || /contiene 0 tavole|Canvas vuoto/i.test(snap)
  const mancano: string[] = []
  for (const s of scritture) {
    const inp = (s.input ?? {}) as Record<string, unknown>
    if (s.strumento === 'createDesignBoards' || s.strumento === 'composeDesign') {
      const tavole = (inp.boards as { name?: string; title?: string }[] | undefined) ?? []
      if (vuoto) { mancano.push(`le tavole di ${s.strumento} (il canvas è vuoto)`); continue }
      for (const t of tavole) if (t.name && !snap.includes(t.name)) mancano.push(`la tavola «${t.name}»`)
    }
    if (s.strumento === 'updateCanvasElements') {
      for (const u of (inp.updates as { id?: string; changes?: { text?: string } }[] | undefined) ?? []) {
        if (!u.id) continue
        if (!snap.includes(u.id)) { mancano.push(`l'elemento «${u.id}»`); continue }
        const t = u.changes?.text?.trim().slice(0, 30)
        if (t && !snap.toLowerCase().includes(t.toLowerCase())) mancano.push(`il testo «${t}» su «${u.id}»`)
      }
    }
  }
  return [...new Set(mancano)].slice(0, 8)
}

/** Nota per il promemoria quando qualcosa manca. */
export function notaVerifica(mancano: string[]): string {
  if (!mancano.length) return ''
  return `## Verifica del canvas\nNel turno precedente hai dichiarato scritture che nello stato attuale del canvas non risultano: ${mancano.join('; ')}. Non dire che sono fatte: rifalle (rileggi gli ID con getCanvasState) oppure di' all'utente con sincerità cosa non è andato.`
}
