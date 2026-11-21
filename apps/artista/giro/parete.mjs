// La sua parete: la prima pagina del sito. A ogni giro scrive un programma con quello che ha in testa
// (umore, parole, colori, legami, tavole, il brano) e il sito lo esegue. Il programma resta in vista, in fondo.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const corto = (t, n) => { t = String(t ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t }
const hash = t => { let h = 2166136261; for (const c of String(t)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

// che campo sceglie a seconda di come si sente
const CAMPI = {
  calmo: { onde: 3, trama: 2, griglia: 1, orbite: 1, flusso: 0.5 },
  curioso: { griglia: 3, orbite: 2, flusso: 1, trama: 1, onde: 1 },
  inquieto: { flusso: 3, griglia: 2, onde: 1, orbite: 0.5, trama: 0.5 },
  giocoso: { orbite: 3, trama: 2, griglia: 2, flusso: 1, onde: 0.5 },
  cupo: { flusso: 3, onde: 2, trama: 1, griglia: 0.5, orbite: 0.5 },
  annoiato: { trama: 3, griglia: 1, onde: 1, flusso: 0.5, orbite: 0.5 },
}
const LENTEZZA = { calmo: 2.2, curioso: 1.2, inquieto: 0.8, giocoso: 1, cupo: 1.6, annoiato: 2.6 }

export function programma(s, img, sale = '') {
  let z = hash(`${s.nome}:${s.giorno}:${s.giri}:${sale}`)
  const r = () => { z = (z + 0x6d2b79f5) >>> 0; let t = z; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const scegli = (pesi) => { const e = Object.entries(pesi).filter(([, w]) => w > 0); let x = r() * e.reduce((a, [, w]) => a + w, 0); for (const [k, w] of e) if ((x -= w) <= 0) return k; return e[0][0] }
  const uno = a => a[Math.floor(r() * a.length)]
  const umore = s.umore ?? 'curioso', T = s.temperatura ?? 0.5
  const S = s.stile ?? {}

  // la tavolozza: la sua firma, i toni che ha usato di recente, i colori che ha letto vicino ai concetti di oggi
  const tono = (s.toni?.length && r() < 0.35 + T * 0.3) ? uno(s.toni) : { bg: S.bg, ink: S.ink, acc: S.acc, scuro: false }
  const cupo = umore === 'cupo' && !tono.scuro && r() < 0.6
  const bg = cupo ? tono.ink : tono.bg, ink = cupo ? tono.bg : tono.ink, acc = tono.acc
  // la parola: tra quelle su cui torna e che gli hanno dato di più, non per forza l'ultima
  const peso = new Map()
  ;(s.archivio ?? []).slice(0, 80).forEach((w, i) => { if (w.parola && w.parola.length > 3) peso.set(w.parola, (peso.get(w.parola) ?? 0) + (0.3 + (w.interesse ?? 0.5)) * (w.tenuta ? 1.5 : 0.6) * Math.exp(-i / 40)) })
  for (const v of String(s.visione?.titolo ?? '').toLowerCase().split(/[^\p{L}]+/u)) if (peso.has(v)) peso.set(v, peso.get(v) * 2.5)
  const scelte = Object.fromEntries([...peso].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, w]) => [k, Math.pow(w, 1.5 - T)]))
  const parola = Object.keys(scelte).length ? scegli(scelte) : String(s.visione?.titolo?.split(/\s+/).pop() || s.nome)
  const LC = s.lessico?.colori ?? []
  const suoi = LC.find(c => c.concetto === parola)?.colori ?? (LC.length ? uno(LC).colori : [])
  const colori = [...new Set([acc, ink, ...suoi])].slice(0, 5)

  const ops = [{ op: 'fondo', bg, ink, acc, grana: +(r() * T).toFixed(2) }]
  const tipi = CAMPI[umore] ?? CAMPI.curioso
  const primo = scegli(tipi)
  const campo = (tipo, peso) => ({
    op: 'campo', tipo, peso: +peso.toFixed(2), colori,
    densita: +(0.3 + r() * 0.6).toFixed(2), lentezza: +((LENTEZZA[umore] ?? 1.2) * (0.7 + r() * 0.6)).toFixed(2),
    scala: Math.round(4 + r() * 10), colonne: Math.round(8 + r() * 16), forma: r() < 0.5 ? 'punto' : 'quadro',
    regola: uno([{ nasce: [3], resta: [2, 3] }, { nasce: [3, 6], resta: [2, 3] }, { nasce: [3, 4], resta: [3, 4] }, { nasce: [2], resta: [] }, { nasce: [3, 6, 7, 8], resta: [3, 4, 6, 7, 8] }]),
    segno: (parola[0] ?? '·').toUpperCase(),
  })
  ops.push(campo(primo, 0.8))
  if (r() < 0.25 + T * 0.4) ops.push(campo(scegli({ ...tipi, [primo]: 0 }), 0.35))

  // la parola di oggi, grande; e se ne ha uno, il legame con un'altra
  ops.push({ op: 'parola', testo: parola, allinea: uno(['sinistra', 'destra', 'centro']), alto: r() < 0.5 })
  const con = (s.lessico?.connettivi ?? []).filter(c => c.n >= 4)
  const altra = (s.archivio ?? []).map(w => w.parola).find(p => p && p !== parola)
  if (con.length && altra && r() < 0.8) { const c = uno(con.slice(0, 12)); ops.push({ op: 'legame', a: parola, via: c.forma, b: altra, rel: c.rel }) }

  // poi il corpo: quello che vuole mostrare, in un ordine che sceglie lui
  const ultima = s.sequenze?.[0]
  const tav = (s.archivio ?? []).filter(w => w.tenuta && img.has(w.id))
  const frasi0 = [
    ...(ultima?.conclusione ? [{ testo: ultima.conclusione, href: `p/${ultima.id}.html` }] : []),
    ...(s.visione?.tesi ?? []).slice(-3).map(t => ({ testo: t.testo })),
    ...(s.sequenze ?? []).slice(1, 4).filter(e => e.conclusione).map(e => ({ testo: e.conclusione, href: `p/${e.id}.html` })),
    // gli enunciati che si è scritto nel quaderno, tra «»
    ...(s.diario ?? []).filter(x => x.tipo === 'quaderno').slice(0, 6).flatMap(x => [...String(x.testo).matchAll(/«([^«»]{12,200})»/g)].map(m => ({ testo: m[1][0].toUpperCase() + m[1].slice(1) + '.' }))).slice(0, 3),
  ].filter(f => f.testo && f.testo.length > 20)
  const frasi = [...new Map(frasi0.map(f => [f.testo, f])).values()]
  const cita = (s.archivio ?? []).flatMap(w => w.letture ?? []).filter(l => /^https?:/.test(l.url ?? ''))
  const pesi = { tavole: 3, frase: frasi.length ? 2.5 : 0, cita: cita.length ? 1 : 0 }
  const usate = new Set(), fatte = new Set()
  const N = 3 + Math.floor(r() * 3)
  for (let i = 0; i < N; i++) {
    const k = scegli(pesi)
    if (k === 'tavole') {
      const d = scegli({ pila: 2, mosaico: 2, orbita: 1.5, fila: 1.5 })
      const ids = tav.filter(w => !usate.has(w.id)).slice(0, d === 'orbita' ? 8 : d === 'fila' ? 10 : 7).map(w => w.id)
      if (ids.length < 3) continue
      ids.forEach(id => usate.add(id))
      ops.push({ op: 'tavole', disposizione: d, ids, colonna: Math.floor(r() * 3) })
      pesi.tavole *= 0.5
    } else if (k === 'frase') {
      const f = frasi.find(f => !fatte.has(f.testo)); if (!f) { pesi.frase = 0; continue }
      fatte.add(f.testo)
      const c = con.map(c => c.forma).find(c => new RegExp(`(^|\\s)${c}(\\s|,|$)`, 'i').test(f.testo))
      ops.push({ op: 'frase', testo: corto(f.testo, 420), evidenzia: c ?? null, href: f.href ?? null, colonna: Math.floor(r() * 4), corpo: +(0.8 + r() * 0.6).toFixed(2) })
    } else { const l = uno(cita); ops.push({ op: 'cita', testo: l.titolo, fonte: l.fonte, href: l.url }); pesi.cita = 0 }
  }
  if (ultima && existsSync(join(s.MEM, 'audio', `${ultima.id}.mp3`))) ops.push({ op: 'ritmo', src: `audio/${ultima.id}.mp3`, titolo: ultima.musica ?? ultima.titolo })
  return { seme: hash(`${s.giorno}:${s.giri}:${parola}:${sale}`), carattere: S.titoli ?? 'Inter', ops }
}

// Decide lui se e quanto cambiare la parete: la tiene finché ha senso, la ritocca quando cambia qualcosa,
// la riscrive quando ha una cosa nuova da dire o se ne è stancato.
export function decidi(MEM, s, img) {
  const F = join(MEM, 'parete.json')
  let A = null
  try { A = JSON.parse(readFileSync(F, 'utf8')) } catch {}
  const T = s.temperatura ?? 0.5, giri = s.giri ?? 0, ultima = s.sequenze?.[0]
  let z = hash(`${s.giorno}:${giri}:decide`)
  const r = () => { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296 }
  const nuovo = programma({ ...s, MEM }, img, String(A?.versioni?.length ?? 0))
  let modo = 'tiene', perche = ''
  if (!A?.P) { modo = 'riscrive'; perche = 'la prima parete' }
  else {
    const noia = (giri - (A.giri ?? 0)) / (5 + 12 * (1 - T)) // più è calmo, più a lungo la sopporta
    if (ultima && ultima.id !== A.sequenza) { modo = r() < 0.7 ? 'riscrive' : 'ritocca'; perche = `è uscita una sequenza nuova, «${corto(ultima.titolo, 60)}»` }
    else if (s.umore && s.umore !== A.umore && r() < 0.6) { modo = 'ritocca'; perche = `mi sento ${s.umore}, non più ${A.umore}` }
    else if (s.visione?.titolo && s.visione.titolo !== A.visione && r() < 0.7) { modo = 'ritocca'; perche = `la mia visione è cambiata: ${s.visione.titolo}` }
    else if (noia > 0.6 + r()) { modo = r() < 0.3 + T * 0.4 ? 'riscrive' : 'ritocca'; perche = `mi ero stancato di guardarla` }
  }
  let P = A?.P
  let toccati = []
  if (modo === 'riscrive') P = nuovo
  else if (modo === 'ritocca') {
    // cambia solo alcune parti: quelle che hanno a che fare con il motivo, più qualcuna a caso
    const parti = ['fondo', 'campo', 'parola', 'tavole', 'frase']
    toccati = perche.startsWith('mi sento') ? ['campo', 'fondo'] : perche.startsWith('la mia visione') ? ['parola', 'frase'] : []
    while (toccati.length < 1 + Math.floor(r() * 2 + T)) { const k = parti[Math.floor(r() * parti.length)]; if (!toccati.includes(k)) toccati.push(k) }
    if (toccati.includes('parola')) toccati.push('legame')
    const ops = []
    for (const o of P.ops) { if (toccati.includes(o.op)) { if (!ops.some(x => x.op === o.op)) ops.push(...nuovo.ops.filter(x => x.op === o.op)) } else ops.push(o) }
    for (const o of nuovo.ops) if (toccati.includes(o.op) && !ops.some(x => x.op === o.op)) ops.splice(o.op === 'legame' ? ops.findIndex(x => x.op === 'parola') + 1 : ops.length, 0, o)
    P = { ...P, seme: nuovo.seme, ops }
  }
  // il brano è sempre l'ultimo, e le tavole sparite dall'archivio si tolgono
  P = { ...P, ops: P.ops.filter(o => o.op !== 'ritmo').map(o => o.op === 'tavole' ? { ...o, ids: o.ids.filter(id => img.has(id)) } : o).filter(o => o.op !== 'tavole' || o.ids.length >= 3).concat(nuovo.ops.filter(o => o.op === 'ritmo')) }
  const versioni = A?.versioni ?? []
  if (modo !== 'tiene') versioni.unshift({ giorno: s.giorno, quando: new Date().toISOString(), modo, perche, toccati: [...new Set(toccati)] })
  const B = modo === 'tiene' ? { ...A, P } : { P, versioni: versioni.slice(0, 60), giri, umore: s.umore, sequenza: ultima?.id ?? null, visione: s.visione?.titolo ?? null }
  writeFileSync(F, JSON.stringify(B))
  return { P, versioni: B.versioni, modo }
}

// il programma come lo scriverebbe lui: leggibile, in fondo alla pagina
export function codice(P) {
  const v = x => typeof x === 'string' ? `"${x}"` : Array.isArray(x) ? `[${x.map(v).join(', ')}]` : typeof x === 'object' && x ? `{${Object.entries(x).map(([k, y]) => `${k}: ${v(y)}`).join(', ')}}` : String(x)
  return P.ops.map(o => {
    const { op, ...a } = o
    if (op === 'campo') return `campo.${a.tipo}(peso=${a.peso}, densità=${a.densita}, lentezza=${a.lentezza}, colori=${v(a.colori)}${a.tipo === 'griglia' ? `, regola=${v(a.regola)}` : ''}${a.tipo === 'trama' ? `, segno=${v(a.segno)}` : ''})`
    if (op === 'tavole') return `tavole.${a.disposizione}(${a.ids.length})`
    if (op === 'frase') return `frase(${v(corto(a.testo, 48))}${a.evidenzia ? `, evidenzia=${v(a.evidenzia)}` : ''})`
    if (op === 'legame') return `legame(${v(a.a)}, ${v(a.via)}, ${v(a.b)})  // ${a.rel}`
    return `${op}(${Object.entries(a).map(([k, y]) => `${k}=${v(typeof y === 'string' ? corto(y, 40) : y)}`).join(', ')})`
  }).join('\n')
}

// ── la lavagna: le cose che ha fatto, disposte da lui per vicinanza di senso ──────────────────────────
const VUOTE = new Set('bensi quanto presente presenza essendo della delle dello degli dalla dalle dagli nella nelle negli sulla sulle sugli alla alle agli come cosa sono essere anche quando dove perché questo questa quello quella tutto tutti ogni loro forse niente stesso stessa altro altra prima dopo ancora sempre modo parte tipo volta fanno fatto lascia tiene tengo prova rima gesto stessa'.split(' '))
// i concetti di un testo: le radici (per riconoscere «città» e «citta», «tempo» e «tempi») e la parola com'era, per il nome del filo
const FORMA = new Map()
const concettiDi = t => new Set(String(t ?? '').toLowerCase().split(/[^a-zàèéìòù]+/).filter(w => w.length >= 5).map(w => { const n = w.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); if (VUOTE.has(n)) return null; const k = n.replace(/[aeiou]$/, ''); if (!FORMA.has(k)) FORMA.set(k, w); return k }).filter(Boolean))
const MISURE = { pila: [620, 760], orbita: [660, 660], fila: [0, 360], mosaico: [720, 0] }

/** dispone le isole: chi condivide un concetto si avvicina (molle), tutti si respingono (niente sovrapposizioni), il nuovo sta al centro */
export function mappa(s, img, P) {
  let z = (P.seme ^ 0x9e3779b9) >>> 0
  const r = () => { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296 }
  const uno = a => a[Math.floor(r() * a.length)]
  const parola = P.ops.find(o => o.op === 'parola')?.testo ?? s.nome
  const isole = []
  isole.push({ tipo: 'parola', testo: parola, w: Math.max(520, parola.length * 90), h: 260, c: concettiDi(parola), fisso: true })
  for (const e of (s.sequenze ?? []).slice(0, 14)) {
    const ids = e.tavole.map(t => t.id).filter(id => img.has(id))
    if (!ids.length) continue
    const disp = ids.length <= 2 ? 'fila' : uno(['pila', 'pila', 'orbita', 'fila', 'mosaico'])
    const n = Math.min(ids.length, disp === 'orbita' ? 8 : 7)
    let [w, h] = MISURE[disp]
    if (disp === 'fila') w = Math.min(n, 4) * 250 + 40
    if (disp === 'mosaico') h = Math.ceil(n / 3) * 290 + 20
    // ogni tanto il ragionamento disteso della sequenza, se c'è (un paragrafo lungo, non sempre)
    const lungo = e.tavole.find(t => t.ruolo === 'conclusione' && String(t.testo ?? '').length > 380)
    isole.push({ tipo: 'sequenza', e, ids: ids.slice(0, n), disp, w: w + 420, h: Math.max(h, 360), c: concettiDi(`${e.titolo} ${e.conclusione}`), giorno: e.giorno, paragrafo: lungo && r() < 0.35 ? lungo.testo : null })
  }
  // i pensieri sparsi: le tesi della visione, gli enunciati del quaderno
  const frasi = [...new Set([...(s.visione?.tesi ?? []).slice(-4).map(t => t.testo), ...(s.diario ?? []).filter(x => x.tipo === 'quaderno').slice(0, 8).flatMap(x => [...String(x.testo).matchAll(/«([^«»]{20,220})»/g)].map(m => m[1]))])].slice(0, 6)
  for (const f of frasi) isole.push({ tipo: 'frase', testo: f, w: 460, h: 120 + Math.ceil(f.length / 34) * 34, c: concettiDi(f) })
  // cosa sta leggendo (solo i titoli: le parole degli altri restano là)
  for (const l of (s.letture ?? []).filter(x => /^https?:/.test(x.url ?? '')).slice(0, 4)) isole.push({ tipo: 'lettura', l, w: 360, h: 110, c: concettiDi(l.titolo) })
  isole.push({ tipo: 'codice', w: 640, h: 520, c: new Set() })
  // i fili: due isole che condividono un concetto (la parola più rara tra quelle in comune fa da nome al filo)
  const df = new Map(); for (const i of isole) for (const k of i.c) df.set(k, (df.get(k) ?? 0) + 1)
  const fili = []
  for (let a = 0; a < isole.length; a++) for (let b = a + 1; b < isole.length; b++) {
    const com = [...isole[a].c].filter(k => isole[b].c.has(k) && df.get(k) <= Math.max(3, isole.length / 4))
    if (com.length) fili.push({ a, b, peso: com.length, nome: FORMA.get(com.sort((x, y) => df.get(x) - df.get(y))[0]) ?? com[0] })
  }
  // le posizioni: una spirale per età (il nuovo vicino al centro), poi le molle e le spinte
  isole.forEach((i, k) => { const ang = k * 2.39996 + r() * 0.6, rad = k ? 700 + Math.sqrt(k) * 620 : 0; i.x = Math.cos(ang) * rad; i.y = Math.sin(ang) * rad * 0.75 })
  for (let it = 0; it < 420; it++) {
    const caldo = 1 - it / 420
    for (const f of fili) { const A = isole[f.a], B = isole[f.b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, vuole = (A.w + B.w) / 2 + 160; const k = 0.012 * Math.min(3, f.peso) * (d - vuole) / d; if (!A.fisso) { A.x += dx * k; A.y += dy * k } if (!B.fisso) { B.x -= dx * k; B.y -= dy * k } }
    for (let a = 0; a < isole.length; a++) for (let b = a + 1; b < isole.length; b++) {
      const A = isole[a], B = isole[b], ox = (A.w + B.w) / 2 + 160 - Math.abs(A.x - B.x), oy = (A.h + B.h) / 2 + 160 - Math.abs(A.y - B.y)
      if (ox > 0 && oy > 0) { const sx = ox < oy ? Math.sign(A.x - B.x || r() - 0.5) * ox / 2 : 0, sy = ox < oy ? 0 : Math.sign(A.y - B.y || r() - 0.5) * oy / 2; if (!A.fisso) { A.x += sx; A.y += sy } if (!B.fisso) { B.x -= sx; B.y -= sy } }
    }
    for (const i of isole) if (!i.fisso) { i.x *= 1 - 0.004 * caldo; i.y *= 1 - 0.004 * caldo } // un po' di gravità verso il centro
  }
  // il mondo: il rettangolo che le contiene tutte, con un margine largo per respirare
  const M = 700
  const x0 = Math.min(...isole.map(i => i.x - i.w / 2)) - M, y0 = Math.min(...isole.map(i => i.y - i.h / 2)) - M
  const W = Math.max(...isole.map(i => i.x + i.w / 2)) + M - x0, H = Math.max(...isole.map(i => i.y + i.h / 2)) + M - y0
  for (const i of isole) { i.x -= x0; i.y -= y0 }
  return { isole, fili, W: Math.round(W), H: Math.round(H), centro: { x: isole[0].x, y: isole[0].y } }
}

export function scriviParete(MEM, s, img, testa, piede, D) {
  copyFileSync(join(QUI, 'parete.js'), join(MEM, 'parete.js'))
  const P = D.P
  const fondo = P.ops[0]
  const by = new Map((s.archivio ?? []).map(w => [w.id, w]))
  const link = id => { const w = by.get(id); return w ? `giorni/${w.giorno}.html#${id}` : 'archivio.html' }
  let z = P.seme
  const r = () => { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296 }
  const L = mappa(s, img, P)
  const legame = P.ops.find(o => o.op === 'legame'), ritmo = P.ops.find(o => o.op === 'ritmo')
  const vita = () => `--p:${(6 + r() * 9).toFixed(1)}s;--f:${(-r() * 9).toFixed(1)}s;--dx:${((r() - 0.5) * 10).toFixed(1)}px;--dy:${((r() - 0.5) * 10).toFixed(1)}px;--rr:${((r() - 0.5) * 1.2).toFixed(2)}deg`
  const box = i => `left:${Math.round(i.x - i.w / 2)}px;top:${Math.round(i.y - i.h / 2)}px;width:${i.w}px;min-height:${i.h}px;${vita()}`
  const tavole = i => {
    const n = i.ids.length
    const im = (id, st = '') => `<a href="${link(id)}" style="${st}" title="${esc(by.get(id)?.titolo ?? '')}"><img loading="lazy" src="img/${id}.jpg" alt=""></a>`
    if (i.disp === 'pila') return `<div class="tav pila">${i.ids.map((id, k) => im(id, `left:${4 + r() * 40}%;top:${(k / n) * 44 + r() * 6}%;transform:rotate(${(r() - 0.5) * 14}deg);z-index:${k}`)).join('')}</div>`
    if (i.disp === 'orbita') return `<div class="tav orbita"><div class="anello">${i.ids.map((id, k) => im(id, `--a:${(k / n) * 360}deg`)).join('')}</div></div>`
    if (i.disp === 'fila') return `<div class="tav fila">${i.ids.map(id => im(id)).join('')}</div>`
    return `<div class="tav mosaico">${i.ids.map((id, k) => im(id, `grid-column:span ${k % 4 === 0 ? 2 : 1}`)).join('')}</div>`
  }
  const isola = (i, k) => {
    if (i.tipo === 'parola') { const fs = Math.min(260, Math.round((i.w * 1.5) / Math.max(3, i.testo.length))); return `<section class="isola parola-isola" id="centro" data-k="${k}" style="${box(i)}"><h1 class="parola" style="font-size:${fs}px">${esc(i.testo)}</h1>${legame ? `<p class="legame"><span>${esc(legame.a)}</span> <em>${esc(legame.via)}</em> <span>${esc(legame.b)}</span></p>` : ''}</section>` }
    if (i.tipo === 'sequenza') { const e = i.e; return `<section class="isola sequenza ${i.disp}" data-k="${k}" style="${box(i)}">${tavole(i)}<div class="testo"><div class="meta">giorno ${e.giorno}${e.musica ? ` · ${esc(e.musica)}` : ''}</div><h2><a href="p/${e.id}.html">${esc(e.titolo)}</a></h2>${e.conclusione && e.conclusione !== e.titolo ? `<p>${esc(corto(e.conclusione, 260))}</p>` : ''}${i.paragrafo ? `<p class="lungo">${esc(corto(i.paragrafo, 900))}</p>` : ''}<a class="vai" href="p/${e.id}.html">la sequenza →</a></div></section>` }
    if (i.tipo === 'frase') return `<section class="isola frase" data-k="${k}" style="${box(i)}"><p>${esc(i.testo)}</p></section>`
    if (i.tipo === 'lettura') return `<section class="isola lettura" data-k="${k}" style="${box(i)}"><span class="meta">sto leggendo</span><a href="${esc(i.l.url)}">${esc(corto(i.l.titolo, 90))}</a><span class="meta">${esc(i.l.fonte ?? '')}</span></section>`
    if (i.tipo === 'codice') return `<section class="isola codice" data-k="${k}" style="${box(i)}"><div class="meta">il codice di oggi — scritto da me, giorno ${s.giorno}</div><pre>${esc(codice(P))}\nlavagna(isole=${L.isole.length}, fili=${L.fili.length})</pre><div class="meta">${D.versioni.length === 1 ? 'è la prima parete che scrivo' : `l'ho cambiata ${D.versioni.length} volte`}</div><ul class="versioni">${D.versioni.slice(0, 6).map(v => `<li><span class="meta">giorno ${v.giorno}</span> ${v.modo === 'riscrive' ? "l'ho riscritta" : `ho ritoccato ${v.toccati.filter(t => t !== 'legame').join(' e ')}`}: ${esc(v.perche)}</li>`).join('')}</ul></section>`
    return ''
  }
  // i fili: curve tra i centri, con il nome del concetto che le lega a metà strada
  const fili = L.fili.map(f => {
    const A = L.isole[f.a], B = L.isole[f.b], mx = (A.x + B.x) / 2 + (r() - 0.5) * 160, my = (A.y + B.y) / 2 + (r() - 0.5) * 160
    return `<g class="filo" data-a="${f.a}" data-b="${f.b}"><path d="M${A.x.toFixed(0)} ${A.y.toFixed(0)} Q${mx.toFixed(0)} ${my.toFixed(0)} ${B.x.toFixed(0)} ${B.y.toFixed(0)}" style="stroke-width:${(1 + f.peso * 0.6).toFixed(1)}"/><text x="${((A.x + 2 * mx + B.x) / 4).toFixed(0)}" y="${((A.y + 2 * my + B.y) / 4).toFixed(0)}">${esc(f.nome)}</text></g>`
  }).join('')
  const corpo = `<div class="lavagna" id="lavagna" tabindex="0" aria-label="la lavagna: trascina per esplorare"><div class="scala" id="scala" style="width:${L.W}px;height:${L.H}px"><div class="mondo" id="mondo" style="width:${L.W}px;height:${L.H}px" data-cx="${Math.round(L.centro.x)}" data-cy="${Math.round(L.centro.y)}">
<svg class="fili" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}">${fili}</svg>
${L.isole.map(isola).join('\n')}
</div></div></div>
<div class="comandi"><button id="meno" aria-label="allontana">−</button><button id="piu" aria-label="avvicina">+</button><button id="casa" aria-label="torna al centro">⌂</button><span class="meta">trascina per esplorare</span></div>
${ritmo ? `<div class="ritmo"><button id="ascolta" data-titolo="${esc(ritmo.titolo)}">▶ ${esc(ritmo.titolo)}</button><audio id="brano" preload="none" src="${ritmo.src}"></audio></div>` : ''}`

  const css = `<style>
html,body{height:100%;overflow:hidden}body{background:${fondo.bg};color:${fondo.ink}}:root{--bg:${fondo.bg};--ink:${fondo.ink};--acc:${fondo.acc}}#campo{position:fixed;inset:0;width:100vw;height:100vh;z-index:0}
header.parete{position:fixed;left:0;top:0;z-index:6;padding:14px max(16px,var(--m));max-width:none;pointer-events:none}header.parete>*{pointer-events:auto}header.parete h1.nome{font-size:22px;margin:0;background:${fondo.bg};display:inline-block;padding:2px 8px}header.parete nav{margin:8px 0 0}header.parete nav a{background:${fondo.bg};padding:3px 6px}
main.pieno{position:fixed;inset:0;z-index:1;max-width:none;padding:0}footer{display:none}
.lavagna{position:absolute;inset:0;overflow:auto;cursor:grab;scrollbar-width:none;outline:none;touch-action:pan-x pan-y}.lavagna::-webkit-scrollbar{display:none}.lavagna.tira{cursor:grabbing}.lavagna.tira *{pointer-events:none}
.scala{position:relative}.mondo{position:absolute;left:0;top:0;transform-origin:0 0}
svg.fili{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}.filo path{fill:none;stroke:${fondo.ink};opacity:.28;stroke-dasharray:6 7;transition:opacity .6s}.filo text{font:15px 'JetBrains Mono',monospace;fill:${fondo.acc};opacity:.75;text-anchor:middle;paint-order:stroke;stroke:${fondo.bg};stroke-width:6px}
.filo.acceso path{opacity:.85;stroke-dasharray:none}.filo.acceso text{opacity:1}
.isola{position:absolute;animation:vive var(--p) ease-in-out var(--f) infinite alternate;opacity:0;transition:opacity 1.4s ease}.isola.visto{opacity:1}
@keyframes vive{from{transform:translate(0,0) rotate(0)}to{transform:translate(var(--dx),var(--dy)) rotate(var(--rr))}}@media(prefers-reduced-motion:reduce){.isola{animation:none}.anello{animation:none}}
.parola-isola{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}.parola{margin:0;line-height:.86;letter-spacing:-.03em;font-family:'${esc(P.carattere)}',serif;white-space:nowrap}
.legame{font:22px/1.2 '${esc(P.carattere)}',serif;margin:18px 0 0}.legame em{color:${fondo.acc}}
.sequenza{display:grid;grid-template-columns:1fr 400px;gap:20px;align-items:start}.sequenza .testo{background:${fondo.bg};padding:16px 18px;box-shadow:0 8px 30px rgba(0,0,0,.08)}.sequenza h2{margin:.2em 0 .3em;font-size:30px}.sequenza h2 a{color:inherit;text-decoration:none}.sequenza p{margin:.4em 0;font-size:18px;line-height:1.5}.sequenza .lungo{font-size:16px;border-left:2px solid ${fondo.acc};padding-left:12px}.vai{font:13px 'JetBrains Mono',monospace}
.tav img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;box-shadow:0 10px 36px rgba(0,0,0,.2)}
.pila .tav{position:relative;height:640px}.tav.pila{position:relative;height:640px}.tav.pila a{position:absolute;width:300px;transition:transform .6s ease}.tav.pila a:hover{transform:rotate(0) scale(1.05)!important;z-index:99!important}
.tav.mosaico{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;grid-auto-flow:dense}
.tav.fila{display:flex;gap:12px}.tav.fila a{flex:0 0 230px}
.tav.orbita{--w:150px;--H:600px;height:var(--H);position:relative}.anello{position:absolute;inset:0;animation:gira 240s linear infinite}
.anello a{position:absolute;left:50%;top:50%;width:var(--w);transform:translate(-50%,-50%) rotate(var(--a)) translateY(calc(var(--w) * .7 - var(--H) / 2)) rotate(calc(-1 * var(--a)))}@keyframes gira{to{transform:rotate(360deg)}}
.frase p{margin:0;font:24px/1.45 Newsreader,Georgia,serif;font-style:italic;background:${fondo.bg};display:inline;box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:.1em .3em}
.lettura{display:flex;flex-direction:column;gap:6px;align-items:flex-start}.lettura>*{background:${fondo.bg};padding:3px 8px}.lettura a{font-size:20px;color:${fondo.ink}}
.codice{background:${fondo.bg};padding:18px;box-shadow:0 8px 30px rgba(0,0,0,.08)}.codice pre{font:12px/1.55 'JetBrains Mono',monospace;white-space:pre-wrap;border-left:3px solid ${fondo.acc};padding-left:12px;margin:10px 0}ul.versioni{list-style:none;padding:0;font-size:14px;line-height:1.6;margin:8px 0 0}
.comandi{position:fixed;right:16px;bottom:16px;z-index:6;display:flex;gap:6px;align-items:center}.comandi button{font:18px/1 'JetBrains Mono',monospace;width:38px;height:38px;border:0;background:${fondo.ink};color:${fondo.bg};cursor:pointer}.comandi .meta{background:${fondo.bg};padding:3px 6px}
.ritmo{position:fixed;right:16px;top:16px;z-index:6}.ritmo button{font:14px 'JetBrains Mono',monospace;background:${fondo.ink};color:${fondo.bg};border:0;padding:10px 14px;cursor:pointer;max-width:60vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:720px){.comandi .meta{display:none}}
</style>`
  const html = testa(s.nome, '', { parete: true, css }) + `<canvas id="campo"></canvas>${corpo}
<script>window.PROGRAMMA=${JSON.stringify(P).replace(/</g, '\\u003c')}</script><script src="parete.js"></script>` + piede
  writeFileSync(join(MEM, 'index.html'), html)
  return P
}
