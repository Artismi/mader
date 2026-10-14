#!/usr/bin/env node
/**
 * Grafiche dei concorrenti, generate in automatico sugli stessi brief e nello
 * stesso formato di Creative OS. Ogni generatore parte solo se c'è la chiave:
 *
 *   google    Google / Nano Banana  GEMINI_API_KEY, il modello d'immagine Gemini più recente
 *   chatgpt   ChatGPT / GPT Image   OpenRouter collegato nell'app (o OPENROUTER_API_KEY), altrimenti OPENAI_API_KEY
 *   canva     Canva                 nessun accesso automatizzabile: segnato "non disponibile"
 *
 * Il prompt è il brief completo, testi compresi, come lo scriverebbe un utente
 * nella chat del servizio; la foto del brief, se c'è, va allegata. Salva
 * out/<concorrente>/<id>.png con <id>.json (modello, prompt, data) e
 * out/<concorrente>/concorrente.json (stato del generatore).
 *
 *   npm run confronto:concorrenti
 *   npm run confronto:concorrenti -- --solo 01-caffe --concorrenti google
 *   npm run confronto:concorrenti -- --rifai      rigenera anche le tavole già fatte
 *
 * Modello forzato: CONFRONTO_MODELLO_GOOGLE, CONFRONTO_MODELLO_CHATGPT.
 */
import fs from 'node:fs'
import path from 'node:path'
import { OUT, REPO, caricaBrief, tavola } from './lib.mjs'
import { chiavi } from './chiavi.mjs'
import { immagineGoogle, immagineOpenRouter, immagineOpenAI, generaGemini, generaOpenRouter, generaOpenAI } from './ia.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const solo = args.solo ? new Set(args.solo.split(',')) : null
const quali = args.concorrenti ? args.concorrenti.split(',') : ['google', 'chatgpt', 'canva']
const brief = caricaBrief().filter(b => !solo || solo.has(b.id))
const k = await chiavi()

const DESCRIZIONE = { '1:1': 'post quadrato 1:1', '4:5': 'post verticale 4:5', '9:16': 'storia verticale 9:16' }
/** Il prompt che scriverebbe un utente: brief, cliente, testi da usare, formato. Uguale per tutti i concorrenti. */
function promptDelBrief(b) {
  return [
    `Crea una grafica per Instagram, ${DESCRIZIONE[b.formato]}, pronta da pubblicare, con tutti i testi scritti dentro l'immagine.`,
    `Cliente: ${b.cliente.nome} (${b.cliente.settore}).`,
    b.brief,
    'Testi e informazioni da usare:',
    ...b.fatti.map(f => `- ${f}`),
    b.foto ? 'Usa la foto allegata come immagine principale.' : '',
  ].filter(Boolean).join('\n')
}

const foto = b => (b.foto ? [{ mime: 'image/jpeg', dati: fs.readFileSync(path.join(REPO, 'scripts/designer/fixtures', b.foto)) }] : [])

/** Un generatore: elenco di modelli candidati e funzione di chiamata; si passa al modello successivo se uno fallisce. */
async function generatori() {
  const g = {}
  if (quali.includes('google')) {
    g.google = k.gemini
      ? { nome: 'Google / Nano Banana', servizio: 'Gemini API', modelli: process.env.CONFRONTO_MODELLO_GOOGLE ? [process.env.CONFRONTO_MODELLO_GOOGLE] : await immagineGoogle(k.gemini), chiama: (m, p, i, f) => generaGemini(k.gemini, m, p, i, f) }
      : { nome: 'Google / Nano Banana', motivo: 'manca GEMINI_API_KEY' }
  }
  if (quali.includes('chatgpt')) {
    const forzato = process.env.CONFRONTO_MODELLO_CHATGPT
    if (k.openrouter) g.chatgpt = { nome: 'ChatGPT / GPT Image', servizio: 'OpenRouter', modelli: forzato ? [forzato] : await immagineOpenRouter(), chiama: (m, p, i, f) => generaOpenRouter(k.openrouter, m, p, i, f) }
    else if (k.openai) g.chatgpt = { nome: 'ChatGPT / GPT Image', servizio: 'OpenAI API', modelli: forzato ? [forzato] : await immagineOpenAI(k.openai), chiama: (m, p, i, f) => generaOpenAI(k.openai, m, p, i, f) }
    else g.chatgpt = { nome: 'ChatGPT / GPT Image', motivo: 'né OpenRouter collegato né OPENAI_API_KEY' }
  }
  if (quali.includes('canva')) {
    // Canva Connect API riempie modelli del Brand Kit (piano Enterprise) e il server MCP di Canva chiede
    // l'accesso interattivo dell'utente: nessuna delle due genera una grafica da un brief senza una persona davanti.
    g.canva = { nome: 'Canva', motivo: 'nessun accesso automatizzabile: Canva Connect API non genera grafiche da un brief e il server MCP di Canva richiede il collegamento interattivo dell\'utente' }
  }
  for (const v of Object.values(g)) if (v.modelli && !v.modelli.length) { v.motivo = 'nessun modello d\'immagine nell\'elenco del servizio'; delete v.modelli }
  return g
}

const gen = await generatori()
for (const [id, g] of Object.entries(gen)) {
  const dir = path.join(OUT, id)
  fs.mkdirSync(dir, { recursive: true })
  const stato = { nome: g.nome, disponibile: !!g.modelli, ...(g.motivo ? { motivo: g.motivo } : { servizio: g.servizio, modelli: g.modelli.slice(0, 4) }), aggiornato: new Date().toISOString() }
  fs.writeFileSync(path.join(dir, 'concorrente.json'), JSON.stringify(stato, null, 2))
  if (!g.modelli) { console.log(`${g.nome}: non disponibile (${g.motivo})`); continue }
  console.log(`${g.nome} · ${g.servizio} · modelli in ordine: ${g.modelli.slice(0, 3).join(', ')}`)
  const esauriti = new Set()
  let ultimoErrore = null
  for (const b of brief) {
    if (tavola(id, b.id) && !args.rifai) { console.log(`  ${b.id.padEnd(20)} c'è già`); continue }
    const prompt = promptDelBrief(b), t0 = Date.now()
    let fatto = false
    for (const m of g.modelli.filter(x => !esauriti.has(x))) {
      try {
        const img = await g.chiama(m, prompt, foto(b), b.formato)
        // si salva com'è arrivata; l'estensione segue il tipo (la pagina e la giuria leggono png, jpg e webp)
        const ext = { 'image/jpeg': '.jpg', 'image/webp': '.webp' }[img.mime] ?? '.png'
        for (const e of ['.png', '.jpg', '.webp']) fs.rmSync(path.join(dir, b.id + e), { force: true })
        fs.writeFileSync(path.join(dir, b.id + ext), img.dati)
        fs.writeFileSync(path.join(dir, `${b.id}.json`), JSON.stringify({ concorrente: g.nome, servizio: g.servizio, modello: m, formato: b.formato, foto: b.foto ?? null, prompt, data: new Date().toISOString() }, null, 2))
        console.log(`  ${b.id.padEnd(20)} ${m} · ${((Date.now() - t0) / 1000).toFixed(1)} s`)
        fatto = true
        break
      } catch (e) {
        console.warn(`  ${b.id.padEnd(20)} ${m}: ${e.message.slice(0, 160)}`)
        ultimoErrore = e.status === 402 ? `credito assente o finito sul servizio (${m})`
          : e.status === 429 && /quota|billing/i.test(e.message) ? `quota esaurita o assente: per le immagini serve la fatturazione attiva (${m})`
          : `${m}: ${e.message.slice(0, 120)}`
        // credito o quota finiti, modello inesistente o non abilitato: non riprovarlo sui brief successivi
        if ([402, 403, 404, 429].includes(e.status)) esauriti.add(m)
      }
    }
    if (!fatto) console.warn(`  ${b.id.padEnd(20)} nessun modello ha risposto`)
  }
  // se non c'è nemmeno una tavola (quota finita, credito assente…) il rapporto lo dice
  if (!brief.some(b => tavola(id, b.id)) && ultimoErrore) {
    stato.disponibile = false
    stato.motivo = `nessuna grafica generata: ${ultimoErrore}`
    fs.writeFileSync(path.join(dir, 'concorrente.json'), JSON.stringify(stato, null, 2))
  }
}
