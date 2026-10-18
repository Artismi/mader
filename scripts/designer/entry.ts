/**
 * Pagina del banco di prova: genera le tavole con il motore vero e le
 * renderizza con Fabric e il motore effetti, come nello Studio. La guida
 * vetrina.mjs (Playwright).
 */
import * as fabric from 'fabric'
import { knobsDagliEsempi, generateSystem, proposeKnobs, proponi, tintaFoto, SYSTEMS, ammesso, type Knobs } from '@/components/studio/designer/gen'
import { styleById } from '@/components/studio/designer/styles'
import { incrocia } from '@/components/studio/designer/gen/incrocio'
import { concetti, simulato, type Idea } from '@/components/studio/designer/gen/concetto'
import { renderScene } from '@/components/studio/designer/render'
import type { DesignContent, Format, Scene, Oggetto3D } from '@/components/studio/designer/types'
import { MOTIVI } from '@/components/studio/designer/progetto/vocabolario'
import { ripiego } from '@/components/studio/designer/progetto/specifica'
import { backendCampi, GENERATORI_CAMPO } from '@/components/studio/designer/campi'
import { formeTolte, TEXTURE_CC0, registraTextureCC0 } from '@/components/studio/designer/gen/risorse'
import { TEXTURE_PROCEDURALI, TEXTURE_LIBRERIA } from '@/components/studio/designer/texture'
import { loadPix } from '@/components/studio/designer/core/foto'
import { sfondoPixel } from '@/components/studio/designer/preview'
import { lettureVere, sottoSoglia } from '@/components/studio/designer/gen/pixel'
import { presentazione, type RuoloSlide } from '@/components/studio/designer/gen/sequenza'
import { programmaDa, impronta as improntaLayout } from '@/components/studio/designer/archivio/scheda'
import { zoneVuote, vuotiNonProgettati, sovrapposizioni, testoMancante } from '@/components/studio/designer/gen/difetti'

/** Difetti misurati sulla tavola consegnata (blocco A): sovrapposizioni, contrasto sui pixel veri, vuoti, testo tagliato o saltato. */
export interface Difetti { sovrapposizioni: string[]; contrasto: string[]; vuoti: number[]; tagliati: string[]; saltati: string[] }
/** luminanza relativa grezza di un colore esadecimale */
const lumi = (h: string) => { const n = parseInt(h.replace('#', '').padEnd(6, '0').slice(0, 6), 16); return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 }

async function difettiScena(sc: Scene, c: DesignContent): Promise<Difetti> {
  const k = (sc.knobs ?? {}) as Partial<Knobs>
  const t = { W: sc.w, H: sc.h, u: Math.min(sc.w, sc.h) / 1080, els: sc.els }
  const reg = styleById(sc.style).registro
  const px = await sfondoPixel(sc, 540)
  const sotto = lettureVere(sc, px).filter(sottoSoglia)
  return {
    sovrapposizioni: sovrapposizioni(t).map(o => `${o.testo}/${o.con}`),
    contrasto: sotto.map(l => `${l.testo}#${l.riga} ${l.contrasto.toFixed(1)}`),
    vuoti: vuotiNonProgettati(zoneVuote(t), { sobrio: ['lusso', 'svizzero', 'editoriale'].includes(reg), voluto: k.idea?.gesto === 'vuoto' }).map(z => +z.frac.toFixed(2)),
    ...testoMancante(sc.els, c, k.idea?.togli ?? []),
  }
}

export interface Job { content: DesignContent; format: Format; photo?: string; over?: Partial<Knobs>; sistemi?: Knobs['sistema'][]; thumb: number }
export interface Result { difetti?: Difetti; sistema: string; ok: boolean; ms: number; url?: string; knobs: Knobs; reasons: string[]; layout?: string; stile?: string; coppia?: string; registro?: string; esame?: Scene['esame']; mattoni?: string[]; risorse?: Risorse; impronta?: number[] }

/** Risorse usate dalla scena (per contare la varietà nelle prime 12): palette, effetti, generatori, foto, trattamenti. */
export interface Risorse { palette: string; fx: string[]; gen: string[]; foto: string[]; trattamento?: string; paletteDa?: string; tex: string[] }
function risorse(sc: Scene): Risorse {
  const fx = new Set<string>(), gen = new Set<string>(), foto = new Set<string>(), tex = new Set<string>()
  for (const el of sc.els) {
    for (const f of ('fx' in el && el.fx) || []) (/^(gen|proc|campo|trama)/i.test(f.id) ? gen : fx).add(f.variant ? `${f.id}:${f.variant}` : f.id)
    if (el.kind === 'ornament') (/^(tex|lib|cc0):/.test(el.id) ? tex : gen).add(el.id.replace(/^cc0:.*\//, 'cc0:'))
    for (const f of ('fx' in el && el.fx) || []) if (f.id === 'textureOverlay' || f.id === 'grunge') tex.add(`${f.id}:${f.variant ?? ''}`)
    if (el.kind === 'image') { if (el.url) foto.add(el.url.split('/').pop()!.split('?')[0]); if (el.look) fx.add('look:' + el.look) }
    const g = (el as { gen?: string }).gen
    if (g) gen.add(g)
  }
  if (sc.finish?.fallback) { fx.add('trama:' + sc.finish.fallback); tex.add('trama:' + sc.finish.fallback) }
  const p = sc.palette
  return { palette: p ? [p.bg, p.ink, p.accent].join('|') : sc.bg, fx: [...fx], gen: [...gen], foto: [...foto], trattamento: (sc.knobs as Knobs | undefined)?.trattamento, paletteDa: sc.palette?.da, tex: [...tex] }
}

async function draw(sc: Scene, thumb: number) {
  const el = document.createElement('canvas')
  const cv = new fabric.Canvas(el, { width: sc.w, height: sc.h, renderOnAddRemove: false, enableRetinaScaling: false })
  const ab = new fabric.Rect({ left: sc.w / 2, top: sc.h / 2, width: sc.w, height: sc.h, fill: '#fff', strokeWidth: 0 })
  ab.set('name', 'tavola'); (ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
  cv.add(ab)
  await renderScene(cv, ab, sc, 'prova')
  cv.renderAll()
  const url = cv.toDataURL({ format: 'jpeg', quality: 0.86, multiplier: thumb })
  cv.dispose()
  return url
}

async function run(job: Job): Promise<Result[]> {
  const sink: string[] = []
  ;(globalThis as { __designerSink?: string[] }).__designerSink = sink
  const tinta = await tintaFoto(job.photo)
  const ks = proposeKnobs(job.content, { hasPhoto: !!job.photo, styleId: job.over?.stile, sistemi: job.sistemi, tinta, seme: (job as { seme?: number }).seme, sperimentazione: job.over?.sperimentazione })
  const out: Result[] = []
  // primo: solo la prima identità (un esemplare per sistema), per confronti a parità di regolatori
  for (const k0 of (job as { primo?: boolean }).primo ? ks.slice(0, job.sistemi?.length ?? ks.length) : ks) {
    const k = { ...k0, ...job.over }
    sink.length = 0
    const t0 = performance.now()
    const sc = await generateSystem(job.content, job.format, k, job.photo)
    const reasons = [...new Set(sink)]
    if (!sc) { out.push({ sistema: k.sistema, ok: false, ms: Math.round(performance.now() - t0), knobs: k, reasons }); continue }
    const url = await draw(sc, job.thumb)
    const st = styleById(k.stile)
    out.push({ sistema: k.sistema, ok: true, ms: Math.round(performance.now() - t0), url, knobs: sc.knobs as Knobs ?? k, reasons, layout: sc.label, stile: st.name, coppia: `${st.display.family} + ${st.text.family}`, registro: st.registro, esame: sc.esame })
  }
  return out
}

/** Le proposte come le vede lo Studio: vivaio ampio, critico, selezione delle migliori diverse. */
async function proposte(job: Job & { n?: number; misura?: boolean }): Promise<{ items: Result[]; scartate: number; motivi: Record<string, number>; candidate: number; promosse: number; giri: number; idee: string[]; concetto: { chiamate: number; token: number }; traccia: string[] }> {
  const sink: string[] = []
  ;(globalThis as { __designerSink?: string[] }).__designerSink = sink
  const t0 = performance.now()
  // C1 a secco: la chiamata del concetto simulata (risponde con le regole), contata
  const conta = { chiamate: 0, token: 0 }
  // le idee dal modello vero (--idee-modello) arrivano già pronte; a secco la chiamata è simulata
  const date = (job as { idee?: Idea[] }).idee
  const idee = (job as { senzaIdee?: boolean }).senzaIdee ? false as const : date ?? await concetti(job.content, { chiedi: simulato(job.content, conta) })
  await texturePronte
  await Promise.all((job.content.immagini ?? []).map(u => loadPix(u)))
  // G2 a secco: i programmi dagli esempi dell'archivio, chiamata simulata e contata (--senza-esempi per spegnerlo)
  const opzE = { conta: { chiamate: 0, token: 0 }, usati: [] as string[] }
  const esempi = (job as { senzaEsempi?: boolean }).senzaEsempi ? false as const : opzE
  const p = await proponi(job.content, job.format, { pixel: (job as { pixel?: boolean }).pixel === false ? undefined : sc => sfondoPixel(sc, 540), photo: job.photo, n: job.n ?? 12, styleId: job.over?.stile, seme: (job as { seme?: number }).seme, sperimentazione: job.over?.sperimentazione, idee, esempi })
  const items: Result[] = []
  for (const sc of p.scene) {
    const k = sc.knobs as Knobs
    const st = styleById(k.stile)
    items.push({ sistema: k.sistema === 'ibrido' ? sc.label.replace('Ibrido ', 'ibrido ') : k.idea ? `${k.sistema}: ${k.idea.gesto}` : k.sistema, ok: true, ms: Math.round(performance.now() - t0), url: await draw(sc, job.thumb), knobs: k, reasons: [], layout: sc.label, stile: st.name, coppia: `${st.display.family} + ${st.text.family}`, registro: st.registro, esame: sc.esame, mattoni: sc.mattoni ?? [k.sistema], risorse: risorse(sc), impronta: improntaLayout(programmaDa(sc), (sc.palette?.bg ? lumi(sc.palette.bg) : 1) < 0.35), ...(job.misura ? { difetti: await difettiScena(sc, job.content) } : {}) })
  }
  return { items, scartate: p.scartate, motivi: classiScarto(sink), candidate: p.candidate, promosse: p.promosse, giri: p.giri, idee: Array.isArray(idee) ? idee.map(i => `${i.gesto}: ${i.nome}`) : [], concetto: conta, esempi: { ...opzE.conta, usati: [...new Set(opzE.usati)] }, traccia: sink.filter(x => x.startsWith('idea ') || x.startsWith('intreccio ') || x.startsWith('esempi ') || x.includes(': pixel ')) }
}

/** G2 da solo: i programmi dagli esempi (simulati) resi con le identità del vivaio, tutte le candidate con voto e difetti. */
async function soloEsempi(job: Job & { n?: number }) {
  await Promise.all((job.content.immagini ?? []).map(u => loadPix(u)))
  const tinta = await tintaFoto(job.photo)
  const pool = proposeKnobs(job.content, { hasPhoto: !!job.photo, tinta, seme: (job as { seme?: number }).seme ?? 0, ampio: 4 })
  const o = { conta: { chiamate: 0, token: 0 }, chiamate: 3 }
  const ks = await knobsDagliEsempi(job.content, job.format, pool, !!job.photo, o, (job as { seme?: number }).seme ?? 0)
  const out = []
  const { scarti } = await import('@/components/studio/designer/gen/tools')
  for (const k of ks) {
    ;(globalThis as { __designerSink?: string[] }).__designerSink = []
    const sc = await generateSystem(job.content, job.format, k, job.photo, { tentativi: 2 })
    if (!sc) { out.push({ ok: false, esempi: k.esempi, difetti: [scarti.ultimo] }); continue }
    out.push(sc ? { ok: true, url: await draw(sc, job.thumb), impronta: improntaLayout(programmaDa(sc), (sc.palette?.bg ? lumi(sc.palette.bg) : 1) < 0.35), voto: sc.esame?.voto, promossa: sc.esame?.promossa, carattere: sc.esame?.carattere?.carattere, difetti: sc.esame?.difetti ?? [], esempi: k.esempi } : { ok: false, esempi: k.esempi, difetti: [] })
  }
  return out
}

/** Una presentazione (blocco A): le slide composte in sequenza, con i difetti misurati di ciascuna. */
async function sequenza(job: { pixel?: boolean; pres: { brand?: string; slides: ({ ruolo: RuoloSlide } & DesignContent)[] }; format: Format; photo?: string; thumb: number; seme?: number }) {
  const sink: string[] = []
  ;(globalThis as { __designerSink?: string[] }).__designerSink = sink
  await texturePronte
  const slides = job.pres.slides.map(({ ruolo, ...c }) => ({ ruolo, c: { brand: job.pres.brand, ...c } as DesignContent }))
  const r = await presentazione(slides, job.format, { photo: job.photo, seme: job.seme, pixel: job.pixel === false ? undefined : sc => sfondoPixel(sc, 540) })
  const items = []
  for (const [i, s] of r.slide.entries()) {
    if (!s.scena) { items.push({ ruolo: s.ruolo, ok: false, provati: s.provati }); continue }
    items.push({ ruolo: s.ruolo, ok: true, sistema: s.sistema, provati: s.provati, layout: s.scena.label, url: await draw(s.scena, job.thumb), esame: s.scena.esame, difetti: await difettiScena(s.scena, slides[i].c) })
  }
  return { items, stile: styleById(r.stile).name, motivi: classiScarto(sink) }
}

/** I tentativi scartati dal codice, per classe (le correzioni, le bocciature e le tracce non contano). */
function classiScarto(sink: string[]) {
  const CL: [string, RegExp][] = [['sovrapposizioni', /sovrappost|troppo vicini|sopra i testi/], ['contrasto', /si legge|leggibil|contorno troppo|pixel/], ['vuoti', /vuot/], ['tagli', /fuori|non entr|troppo (lung|pien|alt)|incomplet|non ci sta/]]
  const out: Record<string, number> = {}
  for (const x of sink) {
    if (/^idea |^intreccio |: spazi (rientrato|spostato|ridotto|accorciato|tolto|riempito|allargato|mosso)|: bocciata|: accorciato|: intreccio annullato|: pixel (colore|velo|fascia|alone)/.test(x)) continue
    const k = CL.find(([, re]) => re.test(x))?.[0] ?? 'altro'
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

/** Gli ibridi dell'incrocio dei mattoni (V1), da soli: per guardarli in un foglio. */
async function ibridi(job: Job): Promise<Result[]> {
  const sink: string[] = []
  ;(globalThis as { __designerSink?: string[] }).__designerSink = sink
  const seme = (job as { seme?: number }).seme
  const tinta = await tintaFoto(job.photo)
  const base = proposeKnobs(job.content, { hasPhoto: !!job.photo, tinta, seme, ampio: 5 })
  const scene = await incrocia(job.content, job.format, { base, seme, valuta: k => generateSystem(job.content, job.format, k, job.photo, { tentativi: 2 }) })
  const out: Result[] = []
  // i motivi più frequenti di scarto e di bocciatura (diagnosi dell'incrocio)
  const conta = new Map<string, number>()
  for (const x of sink) { const m = x.replace(/\d+/g, '#').slice(0, 70); conta.set(m, (conta.get(m) ?? 0) + 1) }
  ;(window as unknown as { ultimiMotivi?: string[] }).ultimiMotivi = [...conta].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([m, n]) => `${n}× ${m}`)
  for (const sc of scene) {
    const k = sc.knobs as Knobs, st = styleById(k.stile)
    out.push({ sistema: sc.label.replace('Ibrido ', ''), ok: true, ms: 0, url: await draw(sc, job.thumb), knobs: k, reasons: [], layout: sc.label, stile: st.name, registro: st.registro, esame: sc.esame, mattoni: sc.mattoni })
  }
  return out
}

/** Impronta visiva: la tavola ridotta a 12×12 (colore), per misurare quanto le proposte si somigliano. */
async function impronta(url: string) {
  const im = new Image(); im.src = url; await im.decode()
  const cv = document.createElement('canvas'); cv.width = 12; cv.height = 12
  const c = cv.getContext('2d')!
  c.drawImage(im, 0, 0, 12, 12)
  return Array.from(c.getImageData(0, 0, 12, 12).data).filter((_, i) => i % 4 !== 3).map(v => v / 255)
}

/**
 * Indice di diversità tra le proposte (0 = tutte uguali): distanza media tra
 * le impronte visive (anche specchiate: lo specchio non è un'idea nuova) e
 * distanza media tra le combinazioni di mattoni (Jaccard; un archetipo intero
 * conta come un mattone solo).
 */
async function diversita(o: { urls: string[]; mattoni: string[][] }) {
  const imp = await Promise.all(o.urls.map(impronta))
  const specchia = (v: number[]) => v.map((_, i) => { const p = Math.floor(i / 3), x = p % 12, y = Math.floor(p / 12); return v[(y * 12 + 11 - x) * 3 + (i % 3)] })
  const d = (a: number[], b: number[]) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length
  const jac = (a: string[], b: string[]) => { const A = new Set(a), B = new Set(b); const i = [...A].filter(x => B.has(x)).length; return 1 - i / new Set([...a, ...b]).size }
  let vis = 0, mat = 0, n = 0
  for (let i = 0; i < imp.length; i++) for (let j = i + 1; j < imp.length; j++) {
    vis += Math.min(d(imp[i], imp[j]), d(imp[i], specchia(imp[j]))); mat += jac(o.mattoni[i], o.mattoni[j]); n++
  }
  return { visiva: n ? vis / n : 0, mattoni: n ? mat / n : 0 }
}

/** Tutti i generatori su una tavola piccola, con il backend che li ha disegnati (foglio --campi). */
async function campi() {
  await texturePronte
  const ids = [...GENERATORI_CAMPO.map(g => `campo:${g}`), 'proc:halftone', 'proc:dot_grid', 'proc:wave_lines', 'proc:zigzag_fill', 'proc:stripe_diagonal', 'proc:crosshatch', 'proc:honeycomb', 'proc:organic_noise', 'proc:perspective_grid', 'proc:circuit_board', 'proc:memphis_mix', 'proc:star_scatter', '3d:sfera', '3d:toro', '3d:cubo', '3d:disco', '3d:capsula', '3d:nodo', '3d:testo', ...TEXTURE_PROCEDURALI.map(t => `tex:${t}`), ...TEXTURE_LIBRERIA.map(t => `lib:${t}`), ...Object.values(TEXTURE_CC0).flat().map(u => `cc0:${u}`)]
  const out: { url: string; label: string; sub: string }[] = []
  for (const [i, id] of ids.entries()) {
    backendCampi.ultimo = /^(tex|lib|cc0):/.test(id) ? 'texture' : id.startsWith('proc:') ? 'fabric' : id.startsWith('3d:') ? 'three webgl' : undefined
    const forma = id.slice(3) as Oggetto3D['forma'], mat = (['plastica', 'cromo', 'oro', 'vetro', 'argilla', 'olografico', 'plastica'] as const)[i % 7]
    const pal = { bg: '#f3efe6', ink: '#1d2b4f', accent: '#e4572e', muted: '#8a8a8a', surface: '#e9e2d3' }
    const sc: Scene = { w: 540, h: 540, bg: pal.bg, palette: pal, els: [{ kind: 'ornament', name: 'campo', id, x: 0, y: 0, w: 540, h: 540, seed: 11 + i * 7, opacity: 0.9, pal, o3d: id.startsWith('3d:') ? { forma, materiale: mat, colore: pal.accent, testo: 'N', famiglia: 'Anton' } : undefined }], layout: 'campi', style: '', label: id }
    out.push({ url: await draw(sc, 1), label: id.replace(/^cc0:.*\//, 'cc0:'), sub: `${backendCampi.ultimo ?? ''}${id.startsWith('3d:') ? ' · ' + mat : ''}` })
  }
  return out
}

/** Foglio contatti composto nella pagina: niente dipendenze esterne per le immagini. */
async function sheet(o: { title: string; items: { url?: string; label: string; sub: string }[]; cols: number; cellW: number; ratio: number }) {
  const pad = 24, labelH = 46, cellH = Math.round(o.cellW * o.ratio)
  const rows = Math.ceil(o.items.length / o.cols)
  const cv = document.createElement('canvas')
  cv.width = o.cols * o.cellW + (o.cols + 1) * pad
  cv.height = 70 + rows * (cellH + labelH + pad) + pad
  const c = cv.getContext('2d')!
  c.fillStyle = '#2b2b2b'; c.fillRect(0, 0, cv.width, cv.height)
  c.fillStyle = '#fff'; c.font = '600 26px Inter, sans-serif'; c.fillText(o.title, pad, 46)
  for (const [i, it] of o.items.entries()) {
    const x = pad + (i % o.cols) * (o.cellW + pad), y = 70 + Math.floor(i / o.cols) * (cellH + labelH + pad)
    if (it.url) {
      const im = new Image(); im.src = it.url; await im.decode()
      c.drawImage(im, x, y, o.cellW, cellH)
    } else {
      c.fillStyle = '#3a2222'; c.fillRect(x, y, o.cellW, cellH)
      c.fillStyle = '#ff8a8a'; c.font = '600 20px Inter, sans-serif'; c.fillText('SCARTATA', x + 16, y + 34)
    }
    c.fillStyle = '#fff'; c.font = '600 17px Inter, sans-serif'; c.fillText(it.label, x, y + cellH + 20)
    c.fillStyle = '#9a9a9a'; c.font = '400 13px Inter, sans-serif'; c.fillText(it.sub.slice(0, Math.floor(o.cellW / 7)), x, y + cellH + 38)
  }
  return cv.toDataURL('image/jpeg', 0.86)
}

// superfici CC0 della cache locale (npm run designer:texture), se ci sono
const texturePronte = registraTextureCC0('http://designer.local/asset-cache/texture/')

;(window as unknown as { designer: unknown }).designer = { run, sheet, proposte, soloEsempi, sequenza, campi, backendCampi: () => ({ ...backendCampi, webgpu: 'gpu' in navigator, formeTolte }), diversita, ibridi, motivi: () => MOTIVI, ripiego, sistemi: (c?: DesignContent, foto?: boolean) => Object.keys(SYSTEMS).filter(id => !c || ammesso(c, id as Knobs['sistema'], !!foto)) }
