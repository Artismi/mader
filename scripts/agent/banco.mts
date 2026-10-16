/**
 * Banco di prova G6 (docs/guscio-agente.md): 20 compiti reali eseguiti da
 * runAgent con un modello alla volta, verifica automatica e rapporto per modello.
 *
 *   node --import ./scripts/agent/register.mjs scripts/agent/banco.mts --env ../../../.env.local
 *   … --modelli google:gemini-flash-latest,anthropic:claude-haiku-5-5   (ID del registro)
 *   … --compiti inc-crea,piano-sposta   --pausa 4000   (ms tra un compito e l'altro, per le quote)
 *
 *   … --livello base   (forza il profilo di guida L1)   --da-capo   (ignora lo stato e ricomincia)
 *   … --a-secco   (modelli finti, nessuna chiamata: token per compito riuscito per profilo)
 *
 * L1: 503 e 429 si riprovano con attese crescenti e ritmo dosato; dopo ogni compito
 * lo stato va in out/banco-stato-<modello>.json e un rilancio riparte da lì; la quota
 * del giorno ferma il modello. Il rapporto ha i token per compito riuscito, per profilo.
 *
 * Ogni modello lavora su un database nuovo e temporaneo (processo separato):
 * i dati veri non vengono toccati. Le chiavi si leggono dal file --env;
 * OpenRouter con OPENROUTER_API_KEY nell'ambiente o nel file.
 * Rapporto in scripts/agent/out/banco-<data>.md e .json.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { eseguiBanco, tabellaCosti, tokenPerRiuscito, type Riga } from './banco/motore'

const QUI = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined }

function loadEnv(file?: string) {
  if (!file) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

/* ── processo figlio: un modello, un database ─────────────────────────── */
async function figlio(modello: string, out: string, soloCompiti?: string[], pausa = 0) {
  process.env.CREATIVE_OS_NO_CATALOG = '1'
  const { tokens } = await import('../../src/lib/db/index')
  if (process.env.OPENROUTER_API_KEY) tokens.upsert({ provider: 'openrouter', provider_token: process.env.OPENROUTER_API_KEY } as never)
  const { candidatesFor, isLivello } = await import('../../src/lib/ai/model-registry')
  const { runAgent } = await import('../../src/lib/agent/run')
  const { COMPITI, seed } = await import('./banco/compiti')
  const tutti = [...candidatesFor({ task: 'design', tools: true }, { includeExhausted: true }), ...candidatesFor({ task: 'general', tools: true }, { includeExhausted: true })]
  const cand = tutti.find(c => c.id === modello)
  if (!cand) { fs.writeFileSync(out, JSON.stringify({ errore: `modello ${modello} non disponibile (chiave mancante?)` })); return }
  const livello = isLivello(opt('livello')) ? opt('livello') as 'forte' | 'medio' | 'base' : undefined
  const s = seed()
  // L1: stato su file per modello e profilo: un rilancio riparte dai compiti già fatti (--da-capo per ricominciare)
  const stato = path.join(QUI, 'out', `banco-stato-${modello.replace(/[^\w.-]+/g, '_')}${livello ? `-${livello}` : ''}.json`)
  fs.mkdirSync(path.dirname(stato), { recursive: true })
  if (args.includes('--da-capo')) fs.rmSync(stato, { force: true })
  const { righe, fermo } = await eseguiBanco({
    modello, stato, pausa, compiti: COMPITI.filter(x => !soloCompiti || soloCompiti.includes(x.id)),
    esegui: async c => {
      const t0 = Date.now()
      let r
      try {
        r = await runAgent({ compito: c.compito, candidati: [cand], maxPassi: 10, livello })
      } catch (e) {
        r = { ok: false, testo: String((e as Error).message), modello: cand.label, passi: 0, chiamate: [], proposte: [], log: [] }
      }
      // quota o servizio giù: il compito non è stato messo alla prova (non è una bocciatura del modello)
      const infra = !r.ok && r.log.length > 0 && r.log.every(l => /: (quota|salta) ·/.test(l))
      const v = r.ok ? c.verifica(r, s) : { ok: false, motivo: `${infra ? 'non eseguito' : 'nessuna risposta'}: ${r.log.at(-1) ?? r.testo}`.slice(0, 200) }
      return { log: r.log, riga: { id: c.id, area: c.area, ok: v.ok, eseguito: !infra, motivo: v.motivo, passi: r.passi, ms: Date.now() - t0, token: r.token, spesa: r.spesa, livello: r.livello ?? livello ?? cand.profile.livello, errori: r.chiamate.filter(x => x.esito === 'errore' || x.esito === 'respinta').length, respinte: r.chiamate.filter(x => x.esito === 'respinta').map(x => `${x.strumento}: ${x.motivo}`), modelloUsato: r.modello, testo: r.testo.slice(0, 300) } }
    },
  })
  if (fermo) console.log(fermo)
  fs.writeFileSync(out, JSON.stringify({ modello, righe }, null, 1))
}

/* ── processo padre: un figlio per modello, poi il rapporto ───────────── */
async function padre() {
  loadEnv(opt('env'))
  // senza --env: .env.local e OpenRouter collegato, anche da un worktree (scripts/ai/chiavi.mjs)
  await (await import('../ai/chiavi.mjs')).caricaChiavi(path.join(QUI, '..', '..'))
  // conti del giorno e memoria delle risposte condivisi tra i figli (ognuno ha il suo database)
  process.env.CREATIVE_OS_AI_DIR ??= path.join(QUI, '..', '..', 'data', 'ai-vie')
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'banco-elenco-')), 'x.db')
  const { tokens } = await import('../../src/lib/db/index')
  if (process.env.OPENROUTER_API_KEY) tokens.upsert({ provider: 'openrouter', provider_token: process.env.OPENROUTER_API_KEY } as never)
  const { candidatesFor } = await import('../../src/lib/ai/model-registry')
  const modelli = opt('modelli')?.split(',').map(s => s.trim()).filter(Boolean)
    ?? [...new Map(candidatesFor({ task: 'general', tools: true, preferisci: 'forte' }, { includeExhausted: true }).map(c => [c.provider, c.id])).values()]
  if (!modelli.length) { console.error('Nessun modello: passa --env con le chiavi (ANTHROPIC_API_KEY, GEMINI_API_KEY) o OPENROUTER_API_KEY.'); process.exit(1) }

  const risultati: { modello: string; righe?: Riga[]; errore?: string }[] = []
  for (const m of modelli) {
    console.log(`\n== ${m} ==`)
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'banco-'))
    const out = path.join(dir, 'esito.json')
    spawnSync(process.execPath, ['--import', pathToFileURL(path.join(QUI, 'register.mjs')).href, path.join(QUI, 'banco.mts'), '--figlio', m, '--out', out, ...(opt('compiti') ? ['--compiti', opt('compiti')!] : []), ...(opt('pausa') ? ['--pausa', opt('pausa')!] : []), ...(opt('livello') ? ['--livello', opt('livello')!] : []), ...(args.includes('--da-capo') ? ['--da-capo'] : [])],
      { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, DATABASE_PATH: path.join(dir, 'banco.db') } })
    risultati.push(fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { modello: m, errore: 'il processo non ha prodotto risultati' })
  }

  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')
  const outDir = path.join(QUI, 'out')
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, `banco-${stamp}.json`), JSON.stringify(risultati, null, 1))
  const md = [`# Banco di prova dell'assistente — ${new Date().toLocaleString('it-IT')}`, '',
    'Riusciti = compiti superati su quelli eseguiti. I compiti fermati da quota o servizio non disponibile sono "non eseguiti" e non contano.', '',
    '| Modello | Riusciti | Non eseguiti | Passi medi | Token in (medi) | Cache | Errori strumenti | Tempo medio |', '|---|---|---|---|---|---|---|---|']
  for (const r of risultati) {
    if (!r.righe) { md.push(`| ${r.modello} | ${r.errore} | | | | | | |`); continue }
    const eseguiti = r.righe.filter(x => x.eseguito !== false)
    const n = eseguiti.length, ok = eseguiti.filter(x => x.ok).length, saltati = r.righe.length - n
    const media = (f: (x: Riga) => number) => Math.round(eseguiti.reduce((a, x) => a + f(x), 0) / Math.max(1, n))
    const inTot = eseguiti.reduce((a, x) => a + (x.token?.input ?? 0), 0), cache = eseguiti.reduce((a, x) => a + (x.token?.cached ?? 0), 0)
    md.push(`| ${r.modello} | **${ok}/${n}** | ${saltati} | ${media(x => x.passi)} | ${media(x => x.token?.input ?? 0)} | ${inTot ? Math.round(cache / inTot * 100) : 0}% | ${r.righe.reduce((a, x) => a + x.errori, 0)} | ${(media(x => x.ms) / 1000).toFixed(1)} s |`)
  }
  // L1: quanto costa un compito riuscito, per profilo di guida
  md.push('', '## Token per compito riuscito', '', 'Token spesi (in + out, tutti i modelli provati) su tutti i compiti eseguiti, diviso i riusciti.', '')
  for (const r of risultati.filter(x => x.righe)) md.push(`**${r.modello}**`, '', ...tabellaCosti(tokenPerRiuscito(r.righe!)), '')
  for (const r of risultati.filter(x => x.righe)) {
    md.push('', `## ${r.modello}`, '', '| Compito | Area | Esito | Motivo |', '|---|---|---|---|')
    for (const x of r.righe!) md.push(`| ${x.id} | ${x.area} | ${x.eseguito === false ? 'non eseguito' : x.ok ? '✔' : '✖'} | ${x.motivo.replace(/\|/g, '/')} |`)
  }
  const file = path.join(outDir, `banco-${stamp}.md`)
  fs.writeFileSync(file, md.join('\n'))
  console.log(`\nRapporto: ${file}`)
}

const f = opt('figlio')
if (args.includes('--a-secco')) {
  // prova a secco: modelli finti, nessuna chiamata ai fornitori (le quote restano intatte)
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'banco-secco-')), 'banco.db')
  const { aSecco } = await import('./banco/secco')
  const righe = await aSecco()
  console.log(['', ...tabellaCosti(tokenPerRiuscito(righe))].join('\n'))
} else if (f) await figlio(f, opt('out')!, opt('compiti')?.split(','), Number(opt('pausa') ?? 0))
else await padre()
