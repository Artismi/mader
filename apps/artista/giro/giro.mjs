// Un giro dell'artista-osservatore senza schermo.
// Lo sveglia GitHub Actions (o chiunque lanci `node giro.mjs`): avvia il programma, gli ridà la memoria,
// gli fa fare qualche studio e una sequenza, monta i video con la musica, pubblica su Instagram,
// salva la memoria e il sito, e si spegne.
import { chromium } from 'playwright-core'
import { spawn, execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { homedir } from 'node:os'
import { scriviBlog } from './sito.mjs'

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
    await pg.evaluate(a => window.__artista.memoria.importa(a), a)
    // le immagini una alla volta: tutte insieme in un messaggio solo, con centinaia di tavole, fanno cadere il browser
    for (const f of readdirSync(join(MEM, 'img'))) if (f.endsWith('.jpg')) {
      try { await pg.evaluate(([id, u]) => window.__artista.memoria.immagine(id, u), [f.slice(0, -4), 'data:image/jpeg;base64,' + readFileSync(join(MEM, 'img', f)).toString('base64')]) } catch (e) { log('immagine: non riesco a riprendere', f, e.message) }
    }
    // il cassetto (le tavole con i loro livelli): una per volta, tutte insieme sforano il messaggio
    if (existsSync(join(MEM, 'cassetto'))) for (const f of readdirSync(join(MEM, 'cassetto'))) if (f.endsWith('.json')) {
      try { await pg.evaluate(([id, j]) => window.__artista.memoria.riponi(id, j), [f.slice(0, -5), readFileSync(join(MEM, 'cassetto', f), 'utf8')]) } catch (e) { log('cassetto: non riesco a riprendere', f, e.message) }
    }
    log(`memoria ripresa: giorno ${a.state?.day ?? 0}, ${a.works.length} opere, ${Object.keys(a.images).length} immagini`)
  } else log('nessuna memoria: nasce adesso')

  // il lavoro
  // l'agenda: che cosa è dovuto (reel ogni 5 ore, carosello ogni 4, storia ogni 8) e se c'è la finestra libera (ogni 2 ore)
  const AG = await pg.evaluate(() => window.__artista.agenda())
  log(`agenda: ${AG.dovute.length ? `tocca a ${AG.dovute.join(', ')}` : 'niente di dovuto'}${AG.libera ? '; finestra libera' : ''} (ultima uscita ${AG.daUltima > 90 ? 'mai' : `${AG.daUltima.toFixed(1)} ore fa`})`)
  const vuoleSequenza = AG.dovute.includes('reel') || AG.dovute.includes('carosello')
  const r = await pg.evaluate(o => window.__artista.giro({ ...o, log: m => console.log(m) }), { studi: STUDI, epN: TAVOLE, reel: REEL, forza: !!process.env.CURATORE_FORZA || AG.dovute.includes('reel'), deve: AG.dovute, ...(vuoleSequenza && !process.env.SEQUENZA ? { sequenza: true } : {}), oreTraPost: Number(process.env.ORE_MIN ?? 0.5), oreMax: Number(process.env.ORE_MAX ?? 4), ...(process.env.SEQUENZA ? { sequenza: process.env.SEQUENZA === 'si' } : {}) })
  log(`giro fatto: ${r.nome}, giorno ${r.giorno}, ${r.opere} tavole nuove${r.episodio ? `, sequenza nuova ${r.episodio}` : ''}${r.pronta ? `; sequenza pronta ${r.pronta}${r.puoPubblicare ? ', si pubblica' : ', aspetta (mezz’ora minima dal post prima)'}` : ''}`)

  // il brano della sequenza, per il sito (mp3)
  if (r.episodio) {
    try {
      const nome = await pg.evaluate(id => window.__artista.branoSequenza(id), r.episodio)
      if (nome) { mkdirSync(join(MEM, 'audio'), { recursive: true }); execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(MEDIA, nome), '-c:a', 'libmp3lame', '-b:a', '128k', join(MEM, 'audio', `${r.episodio}.mp3`)]) }
    } catch (e) { log('brano non salvato:', e.message) }
  }
  // il reel: video + il suo beat (per il sito, e per Instagram se tocca a lui)
  let reelFile = null
  if (r.episodio && REEL) {
    try {
      const rv = await pg.evaluate(id => window.__artista.reelSequenza(id), r.episodio)
      const v = rv?.video ?? (typeof rv === 'string' ? rv : null)
      const brano = rv?.audio ? join(MEDIA, rv.audio) : join(MEDIA, `${r.episodio}-brano.wav`)
      if (v && existsSync(brano)) {
        mkdirSync(join(MEM, 'reel'), { recursive: true })
        reelFile = join(MEM, 'reel', `${r.episodio}.mp4`)
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(MEDIA, v), '-i', brano, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', reelFile])
        log('reel montato con il brano')
        const vecchi = readdirSync(join(MEM, 'reel')).map(f => ({ f, t: statSync(join(MEM, 'reel', f)).mtimeMs })).sort((a, b) => b.t - a.t).slice(6)
        for (const x of vecchi) rmSync(join(MEM, 'reel', x.f))
      }
    } catch (e) { log('reel non montato:', e.message) }
  }

  // che cosa esce adesso: prima quello che è dovuto (il più in ritardo), poi la finestra libera, dove sceglie lui.
  // Mai due uscite a meno di 40 minuti: così reel e carosello vengono sfalsati.
  const PUB_REEL = process.env.PUBBLICA_REEL !== 'no', PUB_STORIE = process.env.PUBBLICA_STORIE !== 'no'
  const possibili = { reel: !!reelFile && PUB_REEL, carosello: !!r.pronta, storia: PUB_STORIE }
  let scelta = null, perche = ''
  if (ig.collegato && AG.daUltima >= 0.66) {
    for (const f of AG.dovute) if (possibili[f]) { scelta = f; perche = `tocca a ${f === 'reel' ? 'un reel' : f === 'storia' ? 'una storia' : 'un carosello'}`; break }
    if (!scelta && AG.libera && r.pronta) { const f = possibili[r.forma] ? r.forma : 'carosello'; scelta = f; perche = 'finestra libera: ho qualcosa da aggiungere' }
  }
  if (scelta) log(`esce ${scelta === 'reel' ? 'un reel' : scelta === 'storia' ? 'una storia' : 'un carosello'} (${perche})`)
  else if (r.pronta) log('la sequenza aspetta la sua finestra')
  const didascalia = async ep => (await pg.evaluate(([id, n]) => window.__artista.preparaPost(id, n), [ep, PER_POST])).didascalia
  if (scelta === 'reel') {
    try {
      const nome = `${r.episodio}-pubblico.mp4`; copyFileSync(reelFile, join(MEDIA, nome))
      const esito = await api('ig-pubblica', { file: [nome], didascalia: await didascalia(r.episodio) }).catch(e => ({ error: String(e) }))
      log(esito.error ? `Instagram (reel): errore — ${esito.error}` : `Instagram: reel pubblicato ${esito.permalink ?? esito.id}`)
      await pg.evaluate(([e, x]) => window.__artista.annotaPubblicazione('reel', e, [], x), [r.episodio, esito])
    } catch (e) { log('reel non pubblicato:', e.message) }
  }
  if (scelta === 'storia') {
    try {
      const w = (r.forma === 'storia' && r.storia) || await pg.evaluate(() => window.__artista.scegliStoria())
      if (!w) throw new Error('nessuna tavola per la storia')
      const nome = await pg.evaluate(([w, e]) => window.__artista.preparaStoria(w, e), [w, r.pronta ?? w])
      mkdirSync(join(MEM, 'storie'), { recursive: true }); copyFileSync(join(MEDIA, nome), join(MEM, 'storie', `${w}.jpg`))
      const esito = await api('ig-storia', { file: nome }).catch(e => ({ error: String(e) }))
      log(esito.error ? `Instagram (storia): errore — ${esito.error}` : `Instagram: storia pubblicata ${esito.id}`)
      await pg.evaluate(([e, w, x]) => window.__artista.annotaPubblicazione('storia', e, [w], x), [r.forma === 'storia' ? r.pronta : null, w, esito])
      if (!esito.error && r.forma === 'storia' && r.pronta) await pg.evaluate(id => window.__artista.lasciaNelSito(id), r.pronta)
    } catch (e) { log('storia non riuscita:', e.message) }
  }
  if (scelta === 'carosello') {
    try {
      const p = await pg.evaluate(([id, n]) => window.__artista.preparaPost(id, n), [r.pronta, PER_POST])
      const file = []
      for (const x of p.pezzi) {
        if (!x.wav) { file.push(x.jpg); continue }
        const out = x.jpg.replace(/\.jpg$/, '.mp4')
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-i', join(MEDIA, x.jpg), '-i', join(MEDIA, x.wav), '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-vf', 'scale=1080:1350', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-shortest', '-movflags', '+faststart', join(MEDIA, out)])
        file.push(out)
      }
      log(`pubblico ${file.length} slide…`)
      const esito = await api('ig-pubblica', { file, didascalia: p.didascalia }).catch(e => ({ error: String(e) }))
      log(esito.error ? `Instagram: errore — ${esito.error}` : `Instagram: pubblicato ${esito.permalink ?? esito.id}`)
      await pg.evaluate(([id, x]) => window.__artista.annotaPubblicazione('carosello', id, [], x), [r.pronta, esito])
    } catch (e) { log('Instagram: errore —', e.message) }
  }
  if (!ig.collegato && r.pronta) log('Instagram non collegato: la sequenza resta nel sito')

  // ascoltare: i numeri e i commenti di quello che ha pubblicato entrano nelle sue scelte
  if (ig.collegato) {
    try {
      const ids = await pg.evaluate(() => window.__artista.daAscoltare())
      if (ids.length) {
        const dati = await api('ig-ascolta', { ids })
        const a = await pg.evaluate(d => window.__artista.ascolta(d), dati)
        log(`ascolto: ${a.ascoltati} contenuti, ${a.commentiNuovi} parole nuove dai commenti${a.migliore ? `; il più arrivato: ${a.migliore}` : ''}${a.errori.length ? ` — non riesco a leggere tutto: ${a.errori.join(' | ')}` : ''}`)
        for (const n of a.note) log(`  ${n}`)
      }
    } catch (e) { log('ascolto non riuscito:', e.message) }
  }

  // salva la memoria (immagini solo delle opere recenti, il resto vive su Instagram e nel sito)
  const m = await pg.evaluate(() => window.__artista.memoria.esporta(0))
  // le immagini una alla volta (tutte insieme in un messaggio solo fanno cadere il browser); quelle già su disco non si rifanno
  const tenere = new Set(await pg.evaluate(() => window.__artista.memoria.recenti(400)))
  mkdirSync(join(MEM, 'img'), { recursive: true })
  for (const id of tenere) {
    if (existsSync(join(MEM, 'img', `${id}.jpg`))) continue
    try { const url = await pg.evaluate(id => window.__artista.memoria.jpeg(id), id); if (url) writeFileSync(join(MEM, 'img', `${id}.jpg`), Buffer.from(url.split(',')[1], 'base64')) } catch (e) { log('immagine: non riesco a salvare', id, e.message) }
  }
  for (const f of readdirSync(join(MEM, 'img'))) if (!tenere.has(f.replace(/\.jpg$/, ''))) rmSync(join(MEM, 'img', f))
  mkdirSync(join(MEM, 'cassetto'), { recursive: true })
  const tieni = new Set()
  for (const id of await pg.evaluate(() => window.__artista.memoria.cassetto())) {
    const j = await pg.evaluate(id => window.__artista.memoria.prendi(id), id)
    if (j) { writeFileSync(join(MEM, 'cassetto', `${id}.json`), j); tieni.add(id) }
  }
  for (const f of readdirSync(join(MEM, 'cassetto'))) if (!tieni.has(f.replace(/\.json$/, ''))) rmSync(join(MEM, 'cassetto', f))
  writeFileSync(arch, JSON.stringify({ state: m.state, works: m.works }))
  // i brani: solo delle ultime 12 sequenze
  if (existsSync(join(MEM, 'audio'))) {
    const tieni = new Set((await pg.evaluate(() => window.__artista.perIlSito())).sequenze.slice(0, 12).map(e => `${e.id}.mp3`))
    for (const f of readdirSync(join(MEM, 'audio'))) if (!tieni.has(f)) rmSync(join(MEM, 'audio', f))
  }
  // il sito
  const s = await pg.evaluate(() => window.__artista.perIlSito())
  try { rmSync(join(MEM, 'appunti.html'), { force: true }) } catch {}
  try { scriviBlog(MEM, s, tenere) } catch (e) { console.error('sito non scritto:', e) } // il sito non deve mai far perdere la memoria
  writeFileSync(join(MEM, '.nojekyll'), '')
  if (process.env.DOMINIO) writeFileSync(join(MEM, 'CNAME'), process.env.DOMINIO + '\n') // il suo indirizzo su artismi, se c'è
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

