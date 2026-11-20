// Il suo blog: lo scrive e lo impagina lui a ogni giro, con i suoi materiali.
// Anche l'aspetto viene da lui: carattere dei titoli, colori e margini sono quelli della sua firma, e cambiano con lei.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const para = t => esc(t).split(/\n{2,}/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
const data = (q) => { if (!q) return ''; try { return new Date(q).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' }) } catch { return '' } }
const corto = (t, n) => { t = String(t ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n).replace(/\s\S*$/, '') + '…' : t }
const REL = { contrasto: 'contrasto', causa: 'causa', somiglianza: 'somiglianza', sequenza: 'sequenza', dubbio: 'dubbio', esempio: 'esempio' }

export function scriviBlog(MEM, s, img) {
  const S = s.stile ?? {}
  const fam = String(S.titoli ?? 'Inter')
  const css = `
@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, '+')}:wght@400;700;900&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=JetBrains+Mono&display=swap');
:root{--bg:${S.bg ?? '#ebe6dc'};--ink:${S.ink ?? '#121212'};--acc:${S.acc ?? '#e3361b'};--m:${Math.round((S.margine ?? 0.06) * 100)}vw}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:19px/1.6 Newsreader,Georgia,serif}
a{color:var(--acc)}header,main,footer{max-width:1100px;margin:auto;padding:0 max(20px,var(--m))}
header{padding-top:48px}h1,h2,h3,.titolo{font-family:'${esc(fam)}',Georgia,serif;font-weight:${S.pesoTitoli ?? 700};line-height:1.05;letter-spacing:-.01em}
h1{font-size:clamp(44px,8vw,96px);margin:0}h2{font-size:clamp(26px,3.6vw,40px);margin:1.4em 0 .3em}h3{font-size:22px;margin:1.2em 0 .2em}
nav{display:flex;gap:18px;flex-wrap:wrap;margin:18px 0 8px;font:14px/1 'JetBrains Mono',monospace;text-transform:lowercase}nav a{color:var(--ink);text-decoration:none;border-bottom:2px solid var(--acc)}
.meta{font:13px/1.4 'JetBrains Mono',monospace;opacity:.7}.bio{max-width:680px;font-size:21px}
.ora{display:inline-block;margin:8px 0 24px;padding:6px 10px;border:1px solid var(--ink);font:13px/1.3 'JetBrains Mono',monospace}
.visione{border-left:4px solid var(--acc);padding:4px 0 4px 18px;margin:24px 0}
.voce{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:28px;padding:28px 0;border-top:1px solid color-mix(in srgb,var(--ink) 25%,transparent)}
.voce.nota{grid-template-columns:1fr}.mini{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.mini img{width:88px;height:110px;object-fit:cover;aspect-ratio:auto}.scarto{opacity:.55}.verbale{font-size:16px;max-width:680px;border-left:1px solid var(--ink);padding-left:14px}.voce img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block}
.voce h2{margin-top:.2em}.voce .breve{font-style:italic;max-width:640px}
@media(max-width:720px){.voce{grid-template-columns:1fr}}
.tavola{margin:40px 0}.tavola img{width:min(100%,760px);display:block}.tavola .testo{max-width:680px}
.pensiero{font-size:24px;max-width:720px;border-top:2px solid var(--ink);padding-top:14px}
audio,video{display:block;margin:14px 0}video{max-height:70vh;aspect-ratio:9/16;background:#000}
.capitolo p{max-width:700px}.tipo{font:12px 'JetBrains Mono',monospace;opacity:.6;text-transform:uppercase;letter-spacing:.08em}
.sw{display:inline-block;width:18px;height:18px;border-radius:50%;vertical-align:middle;margin-right:4px;border:1px solid color-mix(in srgb,var(--ink) 30%,transparent)}
table{border-collapse:collapse}td{padding:4px 14px 4px 0;vertical-align:top}footer{padding:60px 0 80px;font:13px 'JetBrains Mono',monospace;opacity:.7}
`
  writeFileSync(join(MEM, 'stile.css'), css)
  const ig = s.sequenze.find(x => x.instagram?.permalink)?.instagram.permalink?.replace(/\/p\/.*$/, '/') ?? null
  const testa = (titolo, sotto = '') => `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titolo)}</title><link rel="stylesheet" href="${sotto}stile.css"><link rel="alternate" type="application/rss+xml" href="${sotto}feed.xml" title="${esc(s.nome)}"></head><body>
<header><a href="${sotto}index.html" style="text-decoration:none;color:inherit"><h1>${esc(s.nome)}</h1></a>
<nav><a href="${sotto}index.html">diario di bordo</a><a href="${sotto}archivio.html">archivio</a><a href="${sotto}libro.html">il libro</a><a href="${sotto}appunti.html">appunti</a><a href="${sotto}letture.html">letture</a><a href="${sotto}come-parlo.html">come parlo</a>${ig ? `<a href="${esc(ig)}">instagram</a>` : ''}<a href="${sotto}feed.xml">rss</a></nav></header><main>`
  const piede = `</main><footer>${esc(s.nome)} è un generatore procedurale: legge, ragiona con regole e disegna. Nessuna intelligenza artificiale. Questo sito lo scrive e lo impagina lui, a ogni giro. Giorno ${s.giorno}, aggiornato ${data(new Date().toISOString())}.</footer></body></html>`
  const prima = id => (img.has(id) ? `img/${id}.jpg` : null)
  const perGiorno = new Map()
  for (const w of s.archivio ?? []) { if (!perGiorno.has(w.giorno)) perGiorno.set(w.giorno, []); perGiorno.get(w.giorno).push(w) }
  const giorni = [...perGiorno.entries()].sort((a, b) => b[0] - a[0])
  for (const [, ws] of giorni) ws.sort((a, b) => a.quando.localeCompare(b.quando))

  // ── la home: le sequenze e le note, mescolate per giorno ──
  const ora = s.attesa ? (s.attesa.pronta ? 'Adesso: ho una sequenza pronta, esce presto.' : `Adesso: leggo e penso (${Math.min(100, Math.round((s.attesa.accumulo / Math.max(0.1, s.attesa.soglia)) * 100))}% di quello che mi serve per dire qualcosa).`) : ''
  const voci = [
    ...s.sequenze.map(e => ({ g: e.giorno, html: `<article class="voce"><div><div class="meta">giorno ${e.giorno}${e.quando ? ` · ${data(e.quando)}` : ''}${e.musica ? ` · ${esc(e.musica)}` : ''}</div>
      <h2><a href="p/${e.id}.html" style="color:inherit;text-decoration:none">${esc(e.titolo)}</a></h2><p class="breve">${esc(corto(e.conclusione, 260))}</p><a href="p/${e.id}.html">leggi la sequenza →</a></div>
      <div>${e.tavole.map(t => prima(t.id)).find(Boolean) ? `<a href="p/${e.id}.html"><img loading="lazy" src="${e.tavole.map(t => prima(t.id)).find(Boolean)}" alt=""></a>` : ''}</div></article>` })),
    ...giorni.slice(0, 40).map(([g, ws]) => { const q = s.diario.find(x => x.tipo === 'quaderno' && x.giorno === g); return { g: g - 0.1, html: `<article class="voce nota"><div class="meta">giorno ${g} · studio · ${ws.length} tavole</div>
      ${q ? `<div class="breve">${para(q.testo)}</div>` : ''}<div class="mini">${ws.filter(w => prima(w.id)).slice(0, 8).map(w => `<a href="giorni/${g}.html#${w.id}"><img loading="lazy" src="${prima(w.id)}" alt="${esc(w.titolo)}"></a>`).join('')}</div><a href="giorni/${g}.html">tutto il ragionamento del giorno ${g} →</a></article>` } }),
    ...s.diario.filter(x => x.tipo !== 'quaderno').slice(0, 30).map(x => ({ g: x.giorno, html: `<article class="voce nota"><div class="meta">giorno ${x.giorno} · ${x.tipo === 'retorica' ? 'nota sul mio modo di dire' : 'poetica'}</div><div class="breve">${para(x.testo)}</div></article>` })),
  ].sort((a, b) => b.g - a.g)
  const P = s.profilo
  writeFileSync(join(MEM, 'index.html'), testa(s.nome) + `
${P ? `<p class="bio">${esc(P.bio)}</p>${P.perche ? `<p class="meta">${esc(P.perche)}</p>` : ''}` : ''}
${ora ? `<div class="ora">${esc(ora)}</div>` : ''}
${s.visione ? `<div class="visione"><div class="meta">la mia visione, adesso</div><h3>${esc(s.visione.titolo)}</h3>${s.visione.domanda ? `<p>${esc(s.visione.domanda)}</p>` : ''}</div>` : ''}
${voci.map(v => v.html).join('') || '<p>Ancora niente.</p>'}` + piede)

  // ── una pagina per sequenza: le tavole con i loro testi, il brano, il reel, le fonti ──
  mkdirSync(join(MEM, 'p'), { recursive: true })
  s.sequenze.forEach((e, i) => {
    const prec = s.sequenze[i + 1], succ = s.sequenze[i - 1]
    const audio = existsSync(join(MEM, 'audio', `${e.id}.mp3`)), reel = existsSync(join(MEM, 'reel', `${e.id}.mp4`))
    writeFileSync(join(MEM, 'p', `${e.id}.html`), testa(`${e.titolo} — ${s.nome}`, '../') + `
<div class="meta">sequenza ${e.n ?? ''} · giorno ${e.giorno}${e.quando ? ` · ${data(e.quando)}` : ''}</div>
<h2 style="font-size:clamp(34px,6vw,64px)">${esc(e.titolo)}</h2>
${audio ? `<div class="meta">${esc(e.musica ?? 'il brano')}</div><audio controls preload="none" src="../audio/${e.id}.mp3"></audio>` : ''}
${reel ? `<video controls playsinline preload="none" src="../reel/${e.id}.mp4"></video>` : ''}
${e.tavole.map(t => `<section class="tavola">${prima(t.id) ? `<img loading="lazy" src="../${prima(t.id)}" alt="">` : ''}<h3>${esc(t.titolo)}</h3><div class="testo">${para(corto(t.testo, 900))}</div></section>`).join('')}
${e.conclusione ? `<div class="pensiero">${esc(e.conclusione)}</div>` : ''}
${e.domanda ? `<p><em>${esc(e.domanda)}</em></p>` : ''}
${e.letture.length ? `<h3>Ho letto</h3><ul>${e.letture.map(l => `<li><a href="${esc(l.url)}">${esc(l.titolo)}</a> <span class="meta">${esc(l.fonte)}</span></li>`).join('')}</ul>` : ''}
${e.instagram?.permalink ? `<p><a href="${esc(e.instagram.permalink)}">questa sequenza su Instagram</a></p>` : ''}
<p class="meta">${prec ? `<a href="${prec.id}.html">← ${esc(corto(prec.titolo, 50))}</a>` : ''}${prec && succ ? ' · ' : ''}${succ ? `<a href="${succ.id}.html">${esc(corto(succ.titolo, 50))} →</a>` : ''}</p>` + piede)
  })

  // ── l'archivio: ogni giornata, ogni tavola, con il perché e la discussione con sé stesso ──
  mkdirSync(join(MEM, 'giorni'), { recursive: true })
  giorni.forEach(([g, ws], i) => {
    const q = s.diario.filter(x => x.giorno === g)
    const prec = giorni[i + 1]?.[0], succ = giorni[i - 1]?.[0]
    writeFileSync(join(MEM, 'giorni', `${g}.html`), testa(`Giorno ${g} — ${s.nome}`, '../') + `
<div class="meta">${ws[0]?.quando ? data(ws[0].quando) : ''} · ${ws.length} tavole, ${ws.filter(w => w.tenuta).length} tenute</div><h2 style="font-size:clamp(34px,6vw,64px)">Giorno ${g}</h2>
${q.map(x => `<div class="tipo">${esc(x.tipo)}</div>${para(x.testo)}`).join('')}
${ws.map(w => `<section class="tavola${w.tenuta ? '' : ' scarto'}" id="${w.id}">${prima(w.id) ? `<img loading="lazy" src="../${prima(w.id)}" alt="">` : ''}
<div class="meta">${new Date(w.quando).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })} · «${esc(w.parola)}» · ${esc(w.registro)} · ${esc(w.umore)}${w.tenuta ? '' : ' · scartata'}${w.sequenza ? ` · <a href="../p/${w.sequenza.id}.html">nella sequenza «${esc(corto(w.sequenza.titolo, 40))}»</a>` : ''}</div>
<h3>${esc(w.titolo)}</h3>${w.perche ? `<p><em>${esc(w.perche)}</em></p>` : ''}<div class="testo">${para(w.testo)}</div>
${w.verbale.length ? `<details><summary class="meta">come ne ho discusso con me stesso${w.verdetto ? ` — ${w.verdetto === 'tiene' ? 'la tengo' : 'la butto'}` : ''}</summary><div class="verbale">${w.verbale.map(v => `<p>${esc(v)}</p>`).join('')}</div></details>` : ''}
${w.letture.length ? `<p class="meta">${w.letture.map(l => /^https?:/.test(l.url ?? '') ? `<a href="${esc(l.url)}">${esc(l.titolo)}</a>` : esc(l.titolo)).join(' · ')}</p>` : ''}</section>`).join('')}
<p class="meta">${prec != null ? `<a href="${prec}.html">← giorno ${prec}</a>` : ''}${prec != null && succ != null ? ' · ' : ''}${succ != null ? `<a href="${succ}.html">giorno ${succ} →</a>` : ''}</p>` + piede)
  })
  writeFileSync(join(MEM, 'archivio.html'), testa(`Archivio — ${s.nome}`) + `<h2>Archivio</h2><p class="meta">tutte le tavole, anche quelle che ho scartato, giorno per giorno</p>` +
    giorni.map(([g, ws]) => `<h3><a href="giorni/${g}.html" style="color:inherit">Giorno ${g}</a> <span class="meta">${ws.length} tavole</span></h3><div class="mini">${ws.filter(w => prima(w.id)).map(w => `<a href="giorni/${g}.html#${w.id}" title="${esc(w.titolo)}"><img loading="lazy" class="${w.tenuta ? '' : 'scarto'}" src="${prima(w.id)}" alt=""></a>`).join('')}</div>`).join('') + piede)

  // ── il libro: i suoi cantieri, capitolo per capitolo ──
  writeFileSync(join(MEM, 'libro.html'), testa(`Il libro — ${s.nome}`) + (s.libro.length ? s.libro.map(c => `
<h2>${esc(c.titolo)}</h2><div class="meta">su «${esc(c.tema)}», cominciato il giorno ${c.nato}</div>
${c.capitoli.map(k => `<section class="capitolo"><h3>${esc(k.titolo)}</h3>${k.paragrafi.map(p => `<div class="tipo">${esc(p.tipo)}</div>${para(p.testo)}`).join('')}</section>`).join('')}`).join('') : '<p>Non ho ancora cominciato a scrivere un libro.</p>') + piede)

  // ── gli appunti: il quaderno di ogni giornata ──
  writeFileSync(join(MEM, 'appunti.html'), testa(`Appunti — ${s.nome}`) + `<h2>Appunti</h2><p class="meta">quello che annoto ogni giornata, anche quando non pubblico niente</p>` +
    s.diario.slice(0, 120).map(x => `<p><span class="meta">giorno ${x.giorno}${x.quando ? ` · ${data(x.quando)}` : ''} · ${esc(x.tipo)}</span><br>${esc(corto(x.testo, 600))}</p>`).join('') + piede)

  // ── le letture ──
  writeFileSync(join(MEM, 'letture.html'), testa(`Letture — ${s.nome}`) + `<h2>Cosa ho letto</h2><ul>` +
    s.letture.map(l => `<li>${/^https?:/.test(l.url ?? '') ? `<a href="${esc(l.url)}">${esc(l.titolo)}</a>` : esc(l.titolo)} <span class="meta">${esc(l.fonte)}</span></li>`).join('') + `</ul>` + piede)

  // ── come parlo: la retorica che ha imparato ──
  const L = s.lessico
  writeFileSync(join(MEM, 'come-parlo.html'), testa(`Come parlo — ${s.nome}`) + `<h2>Come parlo</h2>
<p class="bio">Non ho frasi scritte da altri. I modi di legare un pensiero all'altro li prendo da quello che leggo, e li cambio quando mi stanco.</p>
<h3>Le parole che uso per legare</h3>${L.connettivi.length ? `<table>${L.connettivi.map(c => `<tr><td><b>${esc(c.forma)}</b></td><td class="meta">${esc(REL[c.rel] ?? c.rel)}</td><td class="meta">letta ${c.n} volte</td></tr>`).join('')}</table>` : '<p>Ancora poche: sto leggendo.</p>'}
<h3>I miei modi di argomentare</h3>${L.mosse.length ? `<ol>${L.mosse.map(m => `<li>${esc(m.descr)} <span class="meta">usato ${m.usi} volte, nato il giorno ${m.nata}</span></li>`).join('')}</ol>` : ''}
<h3>Come dico le relazioni con le immagini</h3>${L.visive.length ? `<table>${L.visive.map(v => `<tr><td><b>${esc(v.rel)}</b></td><td>${esc(v.migliore ?? '—')}</td></tr>`).join('')}</table>` : ''}
<h3>I colori delle cose, come le ho lette</h3>${L.colori.length ? `<p>${L.colori.map(c => `<span style="white-space:nowrap;margin-right:18px">${c.colori.map(h => `<span class="sw" style="background:${esc(h)}"></span>`).join('')}${esc(c.concetto)}</span>`).join(' ')}</p>` : '<p>Ancora nessuno.</p>'}
${S.regole?.length ? `<h3>Le regole della mia firma</h3><ul>${S.regole.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}` + piede)

  // ── il feed ──
  const base = process.env.SITO ?? 'https://artismi.github.io/artista-osservatore/'
  writeFileSync(join(MEM, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(s.nome)}</title><link>${base}</link><description>${esc(s.profilo?.bio ?? '')}</description>` +
    s.sequenze.slice(0, 30).map(e => `<item><title>${esc(e.titolo)}</title><link>${base}p/${e.id}.html</link><guid>${base}p/${e.id}.html</guid>${e.quando ? `<pubDate>${new Date(e.quando).toUTCString()}</pubDate>` : ''}<description>${esc(corto(e.conclusione, 400))}</description></item>`).join('') + `</channel></rss>`)
}
