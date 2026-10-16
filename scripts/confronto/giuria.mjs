#!/usr/bin/env node
/**
 * Giuria di modelli con visione: la misura principale del banco. Ogni coppia
 * (Creative OS contro un concorrente, stesso brief) è giudicata da 3 modelli,
 * due volte a posizioni scambiate, con domande chiuse (vedi DOMANDE in lib.mjs).
 * Le risposte vanno in giuria.jsonl; il verdetto (maggioranza) lo calcola il rapporto.
 *
 *   npm run confronto:giuria
 *   npm run confronto:giuria -- --max 4               solo le prime 4 coppie (prova)
 *   CONFRONTO_GIURIA=gemini:gemini-3.8-flash,openrouter:anthropic/claude-sonnet-5.5,openrouter:openai/gpt-6.1-sol npm run confronto:giuria
 *
 * Scelta dei giurati: un Gemini con visione (GEMINI_API_KEY), poi Claude e GPT su OpenRouter,
 * poi i modelli con visione gratuiti di OpenRouter e altri Gemini. Ogni candidato si prova con
 * una chiamata minima e si tengono i primi tre che rispondono, di famiglie diverse se si può.
 * Si riprende da dove si era rimasti: le risposte già in giuria.jsonl non si richiedono.
 * Ogni risposta porta l'impronta (hash di immagini, domande, giurato e ordine): la stessa coppia
 * non si rigiudica mai, ma una tavola rifatta sì.
 * Ai giurati vanno miniature (lato lungo 512 px; --lato o OCCHIO_LATO per cambiarlo), non le tavole intere.
 */
import path from 'node:path'
import { GIURIA, NOSTRO, DOMANDE, caricaBrief, coppie, chiave, leggiJsonl, aggiungiJsonl } from './lib.mjs'
import { chiavi } from './chiavi.mjs'
import { createHash } from 'node:crypto'
import { miniatura, LATO } from '../occhio/index.mjs'
import { chiediGemini, chiediOpenRouter, visioneGemini, visioneOpenRouter, modelliOpenRouter, modelliGemini } from './ia.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const k = await chiavi()
const brief = caricaBrief()
const perId = Object.fromEntries(brief.map(b => [b.id, b]))
const pausa = ms => new Promise(r => setTimeout(r, ms))

/* ── giurati ───────────────────────────────────────────────────────────── */
const famiglia = id => (id.startsWith('gemini:') || /google\/|gemma/.test(id) ? 'google' : id.split(':')[1].split('/')[0])

async function candidati() {
  if (process.env.CONFRONTO_GIURIA) return process.env.CONFRONTO_GIURIA.split(',').map(s => s.trim()).filter(Boolean)
  const out = []
  const gemini = k.gemini ? await visioneGemini(k.gemini).catch(() => []) : []
  if (gemini[0]) out.push(`gemini:${gemini[0]}`)
  if (k.openrouter) {
    for (const f of ['anthropic', 'openai']) { const m = await visioneOpenRouter(f).catch(() => null); if (m) out.push(`openrouter:${m}`) }
    const gratis = (await modelliOpenRouter().catch(() => [])).filter(m => m.id.endsWith(':free') && m.architecture?.input_modalities?.includes('image')
      && m.architecture?.output_modalities?.join() === 'text' && !/safety|guard|lyria|^openrouter\//.test(m.id))
    out.push(...gratis.map(m => `openrouter:${m.id}`))
  }
  if (k.gemini) {
    out.push(...gemini.slice(1, 3).map(m => `gemini:${m}`))
    const gemma = (await modelliGemini(k.gemini).catch(() => [])).filter(id => /^gemma-\d+-\d+b-it$/.test(id))
    out.push(...gemma.map(m => `gemini:${m}`))
  }
  return out
}

async function chiedi(giurato, prompt, immagini, riprova = 3) {
  const [servizio, ...resto] = giurato.split(':'), modello = resto.join(':')
  for (let tentativo = 0; ; tentativo++) {
    try {
      return servizio === 'gemini' ? await chiediGemini(k.gemini, modello, prompt, immagini) : await chiediOpenRouter(k.openrouter, modello, prompt, immagini)
    } catch (e) {
      // servizio sovraccarico o limite al minuto: si aspetta e si riprova; la quota del giorno finita non torna
      const passeggero = e.status >= 500 || (e.status === 429 && !/quota|credit/i.test(e.message))
      if (passeggero && tentativo < riprova) { await pausa(15_000 * (tentativo + 1)); continue }
      throw e
    }
  }
}

async function scegliGiurati() {
  const tutti = await candidati(), scelti = [], scartati = []
  for (const forzaFamiglia of [true, false]) {
    for (const g of tutti) {
      if (scelti.length >= 3) break
      if (scelti.includes(g) || scartati.includes(g)) continue
      if (forzaFamiglia && scelti.some(s => famiglia(s) === famiglia(g))) continue
      try { await chiedi(g, 'Rispondi solo con {"ok": true}', [], 1); scelti.push(g) } catch (e) { scartati.push(g); console.log(`  ${g} non disponibile: ${e.message.slice(0, 100)}`) }
    }
  }
  return scelti
}

/* ── domande ───────────────────────────────────────────────────────────── */
function prompt(b) {
  return [
    'Sei un direttore artistico con vent\'anni di esperienza in grafica editoriale e social. Guardi due proposte per lo stesso brief: la prima immagine è la proposta 1, la seconda è la proposta 2.',
    `Brief (${b.formato}, cliente ${b.cliente.nome}): ${b.brief}`,
    'Rispondi a ogni domanda con 1 o 2. Usa 0 solo se le due proposte sono davvero equivalenti su quel punto.',
    ...DOMANDE.map(d => `- ${d.id}: ${d.testo}`),
    `Rispondi SOLO con un oggetto JSON: {${DOMANDE.map(d => `"${d.id}": 1`).join(', ')}}`,
  ].join('\n')
}

const lato = Number(args.lato ?? LATO)
const immagine = f => miniatura(f, lato)

/** Dalla risposta del modello alle scelte per domanda: 1 → chi era primo, 2 → chi era secondo, 0 → null. */
function leggi(testo, primo, secondo) {
  const m = String(testo).match(/\{[\s\S]*\}/)
  if (!m) return null
  let j
  try { j = JSON.parse(m[0]) } catch { return null }
  const out = {}
  for (const d of DOMANDE) {
    const v = Number(j[d.id])
    if (![0, 1, 2].includes(v)) return null
    out[d.id] = v === 1 ? primo : v === 2 ? secondo : null
  }
  return out
}

/* ── giro ──────────────────────────────────────────────────────────────── */
let lista = coppie(brief)
if (args.concorrenti) lista = lista.filter(c => args.concorrenti.split(',').includes(c.concorrente))
if (args.max) lista = lista.slice(0, Number(args.max))
if (!lista.length) { console.log('Nessuna coppia da giudicare: servono tavole in out/creative-os e in almeno una cartella di concorrente.'); process.exit(0) }
if (!k.gemini && !k.openrouter) { console.error('Servono GEMINI_API_KEY o OpenRouter collegato per la giuria.'); process.exit(1) }

console.log('Scelgo i giurati…')
const giurati = await scegliGiurati()
if (!giurati.length) { console.error('Nessun modello con visione disponibile.'); process.exit(1) }
console.log(`Giuria: ${giurati.join(', ')}${giurati.length < 3 ? '  (meno di tre: il verdetto vale meno)' : ''}`)

const righe = leggiJsonl(GIURIA)
// le righe vecchie senza impronta valgono per brief e concorrente, come prima
const fatte = new Set([...righe.filter(r => !r.impronta).map(r => `${chiave(r.brief, r.concorrente)}|${r.modello}|${r.ordine}`), ...righe.map(r => r.impronta).filter(Boolean)])
const hash = (...xs) => { const h = createHash('sha256'); for (const x of xs) h.update(x); return h.digest('hex').slice(0, 32) }
let nuove = 0
for (const c of lista) {
  const b = perId[c.brief]
  const [nostro, loro] = await Promise.all([immagine(c.nostro), immagine(c.loro)])
  for (const g of giurati) {
    for (const ordine of ['nostro-primo', 'nostro-secondo']) {
      const impronta = hash(nostro.dati, loro.dati, prompt(b), g, ordine)
      if (fatte.has(impronta) || fatte.has(`${chiave(c.brief, c.concorrente)}|${g}|${ordine}`)) continue
      const [primo, secondo] = ordine === 'nostro-primo' ? [NOSTRO, c.concorrente] : [c.concorrente, NOSTRO]
      const imgs = ordine === 'nostro-primo' ? [nostro, loro] : [loro, nostro]
      let risposte = null, grezza = ''
      for (let t = 0; t < 2 && !risposte; t++) {
        try { grezza = await chiedi(g, prompt(b), imgs); risposte = leggi(grezza, primo, secondo) } catch (e) { grezza = `errore: ${e.message}` }
      }
      if (!risposte) { console.warn(`  ${c.brief} vs ${c.concorrente} · ${g} · ${ordine}: risposta non valida (${grezza.slice(0, 80)})`); continue }
      aggiungiJsonl(GIURIA, { quando: new Date().toISOString(), brief: c.brief, famiglia: c.famiglia, concorrente: c.concorrente, modello: g, ordine, risposte, impronta })
      nuove++
      console.log(`  ${c.brief.padEnd(20)} vs ${c.concorrente.padEnd(12)} ${g.padEnd(40)} ${ordine.padEnd(15)} ${DOMANDE.map(d => `${d.id}=${risposte[d.id] ?? 'pari'}`).join(' ')}`)
    }
  }
}
console.log(`\n${nuove} risposte nuove in ${path.basename(GIURIA)}. Per il rapporto: npm run confronto:rapporto`)
