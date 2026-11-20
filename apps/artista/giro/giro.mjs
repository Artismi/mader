// Un giro dell'artista-osservatore senza schermo.
// Lo sveglia GitHub Actions (o chiunque lanci `node giro.mjs`): avvia il programma, gli ridà la memoria,
// gli fa fare qualche studio e una sequenza, monta i video con la musica, pubblica su Instagram,
// salva la memoria e il sito, e si spegne.
import { chromium } from 'playwright-core'
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { homedir } from 'node:os'

const MEM = process.env.MEMORIA ?? 'memoria'
const PORT = Number(process.env.PORTA ?? 3123)
const BASE = `http://127.0.0.1:${PORT}`
const STUDI = Number(process.env.STUDI ?? 3)
const TAVOLE = Number(process.env.TAVOLE ?? 14)
const PER_POST = Number(process.env.PER_POST ?? 10)
const PUBBLICA = process.env.PUBBLICA !== 'no'
const REEL = process.env.REEL !== 'no'
const MEDIA = join(homedir(), '.artista-osservatore', 'media')
const log = (...a) => console.log('·', ...a)
const pausa = ms => new Promise(r => setTimeout(r, ms))

// ── il token: il segreto del repository, oppure la sua versione rinnovata (cifrata con una chiave che viene dal segreto) ──
const segreto = (process.env.IG_TOKEN ?? '').trim()
const chiave = segreto ? createHash('sha256').update('artista:' + segreto).digest() : null
const cifra = t => { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', chiave, iv); const d = Buffer.concat([c.update(t, 'utf8'), c.final()]); return Buffer.concat([iv, c.getAuthTag(), d]).toString('base64') }
const decifra = s => { const b = Buffer.from(s, 'base64'), d = createDecipheriv('aes-256-gcm', chiave, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28)); return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8') }
let token = segreto
if (chiave && existsSync(join(MEM, 'ig.enc'))) { try { token = decifra(readFileSync(join(MEM, 'ig.enc'), 'utf8').trim()) } catch { token = segreto } }

// ── il programma ──
mkdirSync(MEM, { recursive: true }); mkdirSync(join(MEM, 'img'), { recursive: true })
const srv = spawn(process.execPath, ['app/server.js'], { env: { ...process.env, PORT: String(PORT), HOSTNAME: '127.0.0.1', NODE_ENV: 'production' }, stdio: ['ignore', 'inherit', 'inherit'] })
const fine = async code => { try { await browser?.close() } catch {} srv.kill(); process.exit(code) }
for (let i = 0; i < 60; i++) { if (await fetch(BASE).then(r => r.ok).catch(() => false)) break; await pausa(1000) }
const api = (op, body) => fetch(`${BASE}/api/studio-agent/${op}`, body === undefined ? undefined : { method: 'POST', body: JSON.stringify(body) }).then(r => r.json())
let ig = { collegato: false }
if (token && PUBBLICA) { ig = await api('ig-token', { token }).catch(e => ({ collegato: false, error: String(e) })); log('Instagram:', ig.collegato ? `collegato come @${ig.username}` : `non collegato (${ig.error ?? '?'})`) }

let browser
try {
  browser = await chromium.launch({ channel: process.env.CHROME ? undefined : 'chrome', executablePath: process.env.CHROME || undefined, headless: true, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] })
  const pg = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  pg.on('console', m => { const t = m.text(); if (!/Download the React DevTools|\[Fast Refresh\]/.test(t)) console.log('  ', t.slice(0, 300)) })
  pg.on('pageerror', e => console.log('  errore pagina:', e.message))
  pg.setDefaultTimeout(0)
  await pg.goto(BASE, { waitUntil: 'load' })
  await pg.waitForFunction(() => window.__artista, null, { timeout: 60000 })

  // la memoria
  const arch = join(MEM, 'archivio.json')
  if (existsSync(arch)) {
    const a = JSON.parse(readFileSync(arch, 'utf8'))
    a.images = {}
    for (const f of readdirSync(join(MEM, 'img'))) if (f.endsWith('.jpg')) a.images[f.slice(0, -4)] = 'data:image/jpeg;base64,' + readFileSync(join(MEM, 'img', f)).toString('base64')
    await pg.evaluate(a => window.__artista.memoria.importa(a), a)
    log(`memoria ripresa: giorno ${a.state?.day ?? 0}, ${a.works.length} opere, ${Object.keys(a.images).length} immagini`)
  } else log('nessuna memoria: nasce adesso')

  // il lavoro
  const r = await pg.evaluate(o => window.__artista.giro({ ...o, log: m => console.log(m) }), { studi: STUDI, epN: TAVOLE, reel: REEL, oreTraPost: Number(process.env.ORE_TRA_POST ?? 3), ...(process.env.SEQUENZA ? { sequenza: process.env.SEQUENZA === 'si' } : {}) })
  log(`giro fatto: ${r.nome}, giorno ${r.giorno}, ${r.opere} tavole nuove${r.episodio ? `, sequenza nuova ${r.episodio}` : ''}${r.pronta ? `; sequenza pronta ${r.pronta}${r.puoPubblicare ? ', si pubblica' : ', aspetta (3 ore dal post prima)'}` : ''}`)

  // il post
  if (r.pronta && r.puoPubblicare && (ig.collegato || process.env.PROVA_VIDEO)) {
    try {
      const p = await pg.evaluate(([id, n]) => window.__artista.preparaPost(id, n), [r.pronta, PER_POST])
      const file = []
      for (const x of p.pezzi) {
        if (!x.wav) { file.push(x.jpg); continue }
        const out = x.jpg.replace(/\.jpg$/, '.mp4')
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-i', join(MEDIA, x.jpg), '-i', join(MEDIA, x.wav), '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-vf', 'scale=1080:1350', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', join(MEDIA, out)])
        file.push(out)
      }
      if (!ig.collegato) { log(`prova: ${file.length} slide pronte (${file.join(', ')})`); throw new Error('prova senza Instagram') }
      log(`pubblico ${file.length} slide…`)
      const esito = await api('ig-pubblica', { file, didascalia: p.didascalia }).catch(e => ({ error: String(e) }))
      log(esito.error ? `Instagram: errore — ${esito.error}` : `Instagram: pubblicato ${esito.permalink ?? esito.id}`)
      await pg.evaluate(([id, e]) => window.__artista.annotaPost(id, e), [r.pronta, esito])
    } catch (e) { log('Instagram: errore —', e.message) }
  } else if (r.pronta && !ig.collegato) log('Instagram non collegato: la sequenza resta nel sito')

  // il brano della sequenza, per il sito (mp3)
  if (r.episodio) {
    try {
      const nome = await pg.evaluate(id => window.__artista.branoSequenza(id), r.episodio)
      if (nome) { mkdirSync(join(MEM, 'audio'), { recursive: true }); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(MEDIA, nome), '-c:a', 'libmp3lame', '-b:a', '128k', join(MEM, 'audio', `${r.episodio}.mp3`)]) }
    } catch (e) { log('brano non salvato:', e.message) }
  }

  // il reel: video + brano intero, per il sito (non si pubblica finché non lo decidiamo)
  if (r.episodio && REEL) {
    try {
      const v = await pg.evaluate(id => window.__artista.reelSequenza(id), r.episodio)
      const brano = join(MEDIA, `${r.episodio}-brano.wav`)
      if (v && existsSync(brano)) {
        mkdirSync(join(MEM, 'reel'), { recursive: true })
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(MEDIA, v), '-i', brano, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', join(MEM, 'reel', `${r.episodio}.mp4`)])
        log('reel montato con il brano')
        const tieni = readdirSync(join(MEM, 'reel')).map(f => ({ f, t: statSync(join(MEM, 'reel', f)).mtimeMs })).sort((a, b) => b.t - a.t).slice(4)
        for (const x of tieni) rmSync(join(MEM, 'reel', x.f))
      }
    } catch (e) { log('reel non montato:', e.message) }
  }

  // salva la memoria (immagini solo delle opere recenti, il resto vive su Instagram e nel sito)
  const m = await pg.evaluate(() => window.__artista.memoria.esporta(160))
  const tenere = new Set(Object.keys(m.images))
  for (const [id, url] of Object.entries(m.images)) writeFileSync(join(MEM, 'img', `${id}.jpg`), Buffer.from(url.split(',')[1], 'base64'))
  for (const f of readdirSync(join(MEM, 'img'))) if (!tenere.has(f.replace(/\.jpg$/, ''))) rmSync(join(MEM, 'img', f))
  writeFileSync(arch, JSON.stringify({ state: m.state, works: m.works }))
  // i brani: solo delle ultime 12 sequenze
  if (existsSync(join(MEM, 'audio'))) {
    const tieni = new Set((await pg.evaluate(() => window.__artista.perIlSito())).sequenze.slice(0, 12).map(e => `${e.id}.mp3`))
    for (const f of readdirSync(join(MEM, 'audio'))) if (!tieni.has(f)) rmSync(join(MEM, 'audio', f))
  }
  // il sito
  const s = await pg.evaluate(() => window.__artista.perIlSito())
  writeFileSync(join(MEM, 'index.html'), sito(s, tenere))
  writeFileSync(join(MEM, '.nojekyll'), '')
  // il token rinnovato, cifrato
  try {
    const conf = JSON.parse(readFileSync(join(homedir(), '.artista-osservatore', 'instagram.json'), 'utf8'))
    if (chiave && conf.token && conf.token !== segreto) writeFileSync(join(MEM, 'ig.enc'), cifra(conf.token))
  } catch {}
  log('memoria salvata')
  await fine(0)
} catch (e) {
  console.error('giro fallito:', e)
  await fine(1)
}

function esc(t) { return String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
function sito(s, img) {
  const P = s.profilo, V = s.visione
  const seq = s.sequenze.map(e => `
  <section>
    <h2>${esc(e.titolo)}</h2>
    <p class="meta">giorno ${e.giorno}${e.musica ? ` · ${esc(e.musica)}` : ''}${e.instagram?.permalink ? ` · <a href="${esc(e.instagram.permalink)}">su Instagram</a>` : ''}</p>
    ${existsSync(join(MEM, 'reel', `${e.id}.mp4`)) ? `<video controls playsinline preload="none" src="reel/${e.id}.mp4" class="reel"></video>` : ''}
    ${existsSync(join(MEM, 'audio', `${e.id}.mp3`)) ? `<audio controls preload="none" src="audio/${e.id}.mp3"></audio>` : ''}
    <div class="strip">${e.schede.filter(id => img.has(id)).map(id => `<img loading="lazy" src="img/${id}.jpg" alt="">`).join('')}</div>
    <details><summary>didascalia</summary><pre>${esc(e.didascalia)}</pre></details>
  </section>`).join('')
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(s.nome)}</title>
<style>body{margin:0;background:#0d0d0d;color:#eee;font:16px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px}
h1{font-size:44px;margin:0}h2{font-size:22px;margin:28px 0 4px}.meta{color:#999;font-size:13px;margin:0 0 8px}a{color:#9fe}
.strip{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}.strip img{height:300px;aspect-ratio:4/5;object-fit:cover;border-radius:4px}
video.reel{height:520px;aspect-ratio:9/16;background:#000;border-radius:6px;display:block;margin:6px 0}audio{width:100%;max-width:520px;margin:4px 0 8px}pre{white-space:pre-wrap;font:13px/1.5 ui-monospace,monospace;color:#bbb}.bio{color:#ccc;max-width:720px;white-space:pre-wrap}</style></head>
<body><main>
<h1>${esc(s.nome)}</h1>
<p class="meta">giorno ${s.giorno} · aggiornato ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}</p>
${P ? `<p class="bio">${esc(P.bio)}</p>${P.perche ? `<p class="bio"><i>${esc(P.perche)}</i></p>` : ''}<details><summary>chi sono</summary><p class="bio">${esc(P.presentazione)}</p></details>` : ''}
${V ? `<h2>La mia visione: ${esc(V.titolo)}</h2>${V.domanda ? `<p class="bio">${esc(V.domanda)}</p>` : ''}` : ''}
${seq || '<p>Ancora nessuna sequenza.</p>'}
</main></body></html>`
}
