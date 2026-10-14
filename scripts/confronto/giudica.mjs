#!/usr/bin/env node
/**
 * Giudizio cieco dell'utente: facoltativo e breve. Mostra 10 coppie, quelle su
 * cui la giuria di modelli è più incerta, due tavole per volta in ordine
 * casuale e senza dire chi le ha fatte. Tasti: ← sinistra, → destra, ↓ o
 * spazio pari. I giudizi vanno in giudizi.jsonl e servono a misurare l'accordo
 * tra la giuria e l'utente.
 *
 *   npm run confronto:giudica                    10 coppie incerte, poi apri http://127.0.0.1:4317
 *   npm run confronto:giudica -- --n 20          più coppie
 *   npm run confronto:giudica -- --tutte         tutte le coppie, le meno giudicate prima
 *
 * Server locale minimo: le immagini passano da indirizzi opachi, il nome del
 * file (che dice chi l'ha fatta) non arriva mai alla pagina.
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { GIUDIZI, GIURIA, NOSTRO, caricaBrief, coppie, coppieIncerte, prossimaCoppia, leggiJsonl, aggiungiJsonl } from './lib.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const PORTA = Number(args.porta ?? process.env.CONFRONTO_PORTA ?? 4317)
const brief = caricaBrief()
const perId = Object.fromEntries(brief.map(b => [b.id, b]))
const lista = coppie(brief)
if (!lista.length) { console.error('Nessuna coppia da giudicare: servono tavole in out/creative-os e in almeno una cartella di concorrente.'); process.exit(1) }

// la sessione: le coppie incerte scelte all'avvio (o tutte con --tutte)
const N = args.tutte ? Infinity : Number(args.n ?? 10)
const scelte = args.tutte ? null : coppieIncerte(lista, leggiJsonl(GIURIA), leggiJsonl(GIUDIZI), N)
let fatteOra = 0

/** Coppie mostrate: token opaco → coppia e lati. */
const mostrate = new Map()

function prossima() {
  if (fatteOra >= N) return null
  const c = scelte ? scelte[fatteOra] : prossimaCoppia(lista, leggiJsonl(GIUDIZI))
  if (!c) return null
  const nostroASinistra = Math.random() < 0.5
  const token = randomUUID()
  mostrate.set(token, { ...c, sinistra: nostroASinistra ? NOSTRO : c.concorrente, destra: nostroASinistra ? c.concorrente : NOSTRO, fileSinistra: nostroASinistra ? c.nostro : c.loro, fileDestra: nostroASinistra ? c.loro : c.nostro })
  const b = perId[c.brief]
  return { token, brief: b.brief, formato: b.formato, fatte: fatteOra, totale: scelte ? scelte.length : lista.length }
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
const invia = (res, stato, corpo, tipo = 'application/json; charset=utf-8') => { res.writeHead(stato, { 'Content-Type': tipo, 'Cache-Control': 'no-store' }); res.end(corpo) }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x')
  if (req.method === 'GET' && u.pathname === '/') return invia(res, 200, PAGINA, 'text/html; charset=utf-8')
  if (req.method === 'GET' && u.pathname === '/api/coppia') return invia(res, 200, JSON.stringify(prossima() ?? { finito: true, fatte: fatteOra }))
  const img = u.pathname.match(/^\/img\/([\w-]+)\/(sinistra|destra)$/)
  if (req.method === 'GET' && img) {
    const m = mostrate.get(img[1])
    if (!m) return invia(res, 404, '')
    const f = img[2] === 'sinistra' ? m.fileSinistra : m.fileDestra
    return invia(res, 200, fs.readFileSync(f), MIME[path.extname(f).toLowerCase()] ?? 'image/png')
  }
  if (req.method === 'POST' && u.pathname === '/api/giudizio') {
    let corpo = ''
    for await (const parte of req) corpo += parte
    const { token, voto } = JSON.parse(corpo || '{}')
    const m = mostrate.get(token)
    if (!m || !['sinistra', 'destra', 'pari'].includes(voto)) return invia(res, 400, JSON.stringify({ error: 'giudizio non valido' }))
    mostrate.delete(token)
    const vincitore = voto === 'pari' ? null : m[voto]
    aggiungiJsonl(GIUDIZI, { quando: new Date().toISOString(), giudice: 'utente', brief: m.brief, famiglia: m.famiglia, concorrente: m.concorrente, sinistra: m.sinistra, destra: m.destra, voto, vincitore })
    fatteOra++
    return invia(res, 200, JSON.stringify({ ok: true }))
  }
  invia(res, 404, '')
})
server.listen(PORTA, '127.0.0.1', () => console.log(`Giudizio cieco: http://127.0.0.1:${PORTA}  (${scelte ? `${scelte.length} coppie scelte dove la giuria è più incerta` : `${lista.length} coppie`}; Ctrl+C per chiudere)`))

const PAGINA = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Confronto cieco</title>
<style>
  :root { color-scheme: dark; --fondo: #161616; --testo: #eee; --tenue: #8a8a8a; --linea: #2c2c2c; --accento: #e8e8e8 }
  * { box-sizing: border-box }
  body { margin: 0; background: var(--fondo); color: var(--testo); font: 15px/1.45 system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column }
  header { padding: 14px 20px; border-bottom: 1px solid var(--linea); display: flex; gap: 16px; align-items: baseline }
  header b { font-weight: 600 } header span { color: var(--tenue); font-size: 13px }
  #brief { padding: 10px 20px; color: var(--tenue); font-size: 14px; max-width: 1100px }
  main { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 10px 20px; min-height: 0 }
  figure { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 0; cursor: pointer; border: 2px solid transparent; border-radius: 6px }
  figure:hover { border-color: var(--linea) }
  figure img { max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 6px 30px #0008 }
  footer { display: flex; gap: 10px; justify-content: center; padding: 14px }
  button { background: #222; color: var(--testo); border: 1px solid var(--linea); border-radius: 6px; padding: 10px 18px; font: inherit; cursor: pointer }
  button:hover { border-color: var(--accento) }
  kbd { color: var(--tenue); font-size: 12px; margin-left: 6px }
  #fine { margin: auto; text-align: center; color: var(--tenue) }
  @media (max-width: 700px) { main { grid-template-columns: 1fr } }
</style></head><body>
<header><b>Confronto cieco</b><span id="avanz"></span><span>Quale useresti per il cliente?</span></header>
<div id="brief"></div>
<main id="tavole"><figure data-v="sinistra"><img id="sx" alt="tavola a sinistra"></figure><figure data-v="destra"><img id="dx" alt="tavola a destra"></figure></main>
<footer id="tasti"><button data-v="sinistra">Sinistra<kbd>←</kbd></button><button data-v="pari">Pari<kbd>↓ spazio</kbd></button><button data-v="destra">Destra<kbd>→</kbd></button></footer>
<script>
let token = null, occupato = false
async function carica() {
  const j = await (await fetch('/api/coppia')).json()
  if (j.finito) {
    document.getElementById('tavole').remove(); document.getElementById('tasti').remove(); document.getElementById('brief').textContent = ''; document.getElementById('avanz').textContent = ''
    document.body.insertAdjacentHTML('beforeend', '<p id="fine">Fatto: ' + j.fatte + ' giudizi salvati.<br>Per i risultati: npm run confronto:rapporto</p>')
    return
  }
  token = j.token
  document.getElementById('avanz').textContent = (j.fatte + 1) + ' di ' + j.totale
  document.getElementById('brief').textContent = j.formato + ' · ' + j.brief
  document.getElementById('sx').src = '/img/' + token + '/sinistra'
  document.getElementById('dx').src = '/img/' + token + '/destra'
  occupato = false
}
async function vota(v) {
  if (!token || occupato) return
  occupato = true
  await fetch('/api/giudizio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, voto: v }) })
  carica()
}
document.addEventListener('click', e => { const t = e.target.closest('[data-v]'); if (t) vota(t.dataset.v) })
document.addEventListener('keydown', e => {
  const v = { ArrowLeft: 'sinistra', ArrowRight: 'destra', ArrowDown: 'pari', ' ': 'pari' }[e.key]
  if (v) { e.preventDefault(); vota(v) }
})
carica()
</script></body></html>`
