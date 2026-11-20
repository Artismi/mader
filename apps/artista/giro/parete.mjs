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

export function scriviParete(MEM, s, img, testa, piede, D) {
  copyFileSync(join(QUI, 'parete.js'), join(MEM, 'parete.js'))
  const P = D.P
  const fondo = P.ops[0]
  const by = new Map((s.archivio ?? []).map(w => [w.id, w]))
  const link = id => { const w = by.get(id); return w ? `giorni/${w.giorno}.html#${id}` : 'archivio.html' }
  let z = P.seme
  const r = () => { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; return z / 4294967296 }
  const corpo = P.ops.map(o => {
    if (o.op === 'parola') {
      const fs = `min(${(170 / Math.max(3, o.testo.length)).toFixed(1)}vw, 42vh)`
      return `<section class="eroe ${o.alto ? 'alto' : ''}" style="text-align:${o.allinea === 'sinistra' ? 'left' : o.allinea === 'destra' ? 'right' : 'center'}"><h1 class="parola" style="font-size:${fs}">${esc(o.testo)}</h1></section>`
    }
    if (o.op === 'legame') return `<section class="legame entra"><span>${esc(o.a)}</span><svg viewBox="0 0 400 20" preserveAspectRatio="none"><path d="M0 10 C 120 ${r() * 20}, 280 ${r() * 20}, 400 10"/></svg><em>${esc(o.via)}</em><svg viewBox="0 0 400 20" preserveAspectRatio="none"><path d="M0 10 C 120 ${r() * 20}, 280 ${r() * 20}, 400 10"/></svg><span>${esc(o.b)}</span></section>`
    if (o.op === 'frase') {
      let t = esc(o.testo)
      if (o.evidenzia) t = t.replace(new RegExp(`(^|\\s)(${o.evidenzia})(?=\\s|,|$)`, 'i'), '$1<b>$2</b>')
      return `<section class="frase entra" style="margin-left:${o.colonna * 8}%;font-size:calc(${o.corpo} * clamp(22px,2.6vw,34px))"><p>${t}</p>${o.href ? `<a href="${o.href}">la sequenza →</a>` : ''}</section>`
    }
    if (o.op === 'cita') return `<section class="cita entra"><span class="meta">sto leggendo</span><a href="${esc(o.href)}">${esc(o.testo)}</a><span class="meta">${esc(o.fonte)}</span></section>`
    if (o.op === 'tavole') {
      const n = o.ids.length
      const im = (id, st = '') => `<a href="${link(id)}" style="${st}" title="${esc(by.get(id)?.titolo ?? '')}"><img loading="lazy" src="img/${id}.jpg" alt=""></a>`
      if (o.disposizione === 'pila') return `<section class="tav pila entra">${o.ids.map((id, i) => im(id, `left:${8 + r() * 52}%;top:${(i / n) * 50 + r() * 8}%;transform:rotate(${(r() - 0.5) * 14}deg);z-index:${i}`)).join('')}</section>`
      if (o.disposizione === 'orbita') return `<section class="tav orbita entra"><div class="anello">${o.ids.map((id, i) => im(id, `--a:${(i / n) * 360}deg`)).join('')}</div></section>`
      if (o.disposizione === 'fila') return `<section class="tav fila entra">${o.ids.map(id => im(id)).join('')}</section>`
      return `<section class="tav mosaico entra" style="margin-left:${o.colonna * 6}%">${o.ids.map((id, i) => im(id, `grid-column:span ${i % 3 === 0 ? 2 : 1};grid-row:span ${r() < 0.3 ? 2 : 1}`)).join('')}</section>`
    }
    if (o.op === 'ritmo') return `<section class="ritmo"><button id="ascolta" data-titolo="${esc(o.titolo)}">▶ ${esc(o.titolo)}</button><audio id="brano" preload="none" src="${o.src}"></audio></section>`
    return ''
  }).join('\n')

  const css = `<style>
body{background:${fondo.bg};color:${fondo.ink}}:root{--bg:${fondo.bg};--ink:${fondo.ink};--acc:${fondo.acc}}#campo{position:fixed;inset:0;width:100vw;height:100vh;z-index:0}
.parete{position:relative;z-index:1}.parete header{background:none}.parete h1.nome{font-size:22px}
.eroe{min-height:88svh;display:flex;flex-direction:column;justify-content:flex-end;padding:0 max(16px,var(--m)) 6vh}.eroe.alto{justify-content:flex-start;padding-top:8vh}
.parola{margin:0;line-height:.86;letter-spacing:-.03em;color:${fondo.ink};white-space:nowrap;text-shadow:0 0 40px ${fondo.bg},0 0 12px ${fondo.bg}}
.legame{display:grid;grid-template-columns:auto 1fr auto 1fr auto;align-items:center;gap:14px;max-width:1100px;margin:0 auto 18vh;padding:0 max(16px,var(--m));font:clamp(18px,2.4vw,30px)/1 '${esc(P.carattere)}',serif}
.legame span,.legame em{background:${fondo.bg};padding:6px 10px}.legame em{color:${fondo.acc};font-style:italic}
.legame svg{height:20px;width:100%;overflow:visible}.legame path{fill:none;stroke:${fondo.ink};stroke-width:1.5;stroke-dasharray:500;stroke-dashoffset:500;transition:stroke-dashoffset 3s ease}.legame.visto path{stroke-dashoffset:0}
.frase{max-width:min(820px,88vw);margin:0 auto 16vh;padding:0 max(16px,var(--m))}.frase p{display:inline;background:${fondo.bg};box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:.1em .3em;line-height:1.55}
.frase b{color:${fondo.acc};font-weight:inherit;font-style:italic}.frase a{display:inline-block;margin-top:14px;background:${fondo.bg};padding:4px 8px;font:14px 'JetBrains Mono',monospace}
.cita{display:flex;flex-direction:column;gap:6px;align-items:flex-start;max-width:700px;margin:0 auto 16vh;padding:0 max(16px,var(--m))}.cita>*{background:${fondo.bg};padding:4px 8px}.cita a{font-size:clamp(22px,3vw,36px);color:${fondo.ink}}
.tav{margin:0 auto 18vh;padding:0 max(16px,var(--m));max-width:1300px}.tav img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;box-shadow:0 10px 40px rgba(0,0,0,.18)}
.pila{position:relative;height:min(150vw,140vh)}.pila a{position:absolute;width:min(46vw,380px);transition:transform .6s ease}.pila a:hover{transform:rotate(0) scale(1.04)!important;z-index:99!important}
.mosaico{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;grid-auto-flow:dense}.mosaico img{height:100%}
.fila{display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;max-width:none}.fila a{flex:0 0 min(70vw,420px);scroll-snap-align:center}
.orbita{--w:min(18vw,170px);--H:min(100vw,100vh);height:var(--H);position:relative}.anello{position:absolute;inset:0;animation:gira 240s linear infinite}
.anello a{position:absolute;left:50%;top:50%;width:var(--w);transform:translate(-50%,-50%) rotate(var(--a)) translateY(calc(var(--w) * .7 - var(--H) / 2)) rotate(calc(-1 * var(--a)))}
@keyframes gira{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.anello{animation:none}}
.entra{opacity:0;transform:translateY(30px);transition:opacity 1.6s ease,transform 1.6s ease}.entra.visto{opacity:1;transform:none}
.ritmo{position:fixed;right:16px;top:16px;z-index:5}.ritmo button{font:14px 'JetBrains Mono',monospace;background:${fondo.ink};color:${fondo.bg};border:0;padding:10px 14px;cursor:pointer;max-width:70vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.codice{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:40px max(16px,var(--m))}.versioni{background:${fondo.bg};padding:4px 8px;display:inline-block;margin:8px 0 0}ul.versioni{list-style:none;padding:12px 18px;font-size:16px;line-height:1.7}.codice pre{background:${fondo.bg};padding:18px;font:13px/1.6 'JetBrains Mono',monospace;white-space:pre-wrap;border-left:3px solid ${fondo.acc}}
.parete footer,.parete nav a,.parete .meta{background:${fondo.bg}}.parete nav{margin:0}.parete header{padding-top:18px}
</style>`
  const html = testa(s.nome, '', { parete: true, css }) + `<canvas id="campo"></canvas><div class="parete">${corpo}</div>
<section class="codice"><div class="meta">il codice di oggi — scritto da me, giorno ${s.giorno}</div><pre>${esc(codice(P))}</pre>
<div class="meta versioni">${D.versioni.length === 1 ? 'è la prima parete che scrivo' : `l'ho cambiata ${D.versioni.length} volte`}</div>
<ul class="versioni">${D.versioni.slice(0, 10).map(v => `<li><span class="meta">giorno ${v.giorno} · ${new Date(v.quando).toLocaleString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })}</span> ${v.modo === 'riscrive' ? "l'ho riscritta" : `ho ritoccato ${v.toccati.filter(t => t !== 'legame').join(' e ')}`}: ${esc(v.perche)}</li>`).join('')}</ul></section>
<script>window.PROGRAMMA=${JSON.stringify(P).replace(/</g, '\\u003c')}</script><script src="parete.js"></script>` + piede
  writeFileSync(join(MEM, 'index.html'), html)
  return P
}
