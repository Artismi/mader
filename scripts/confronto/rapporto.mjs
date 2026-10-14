#!/usr/bin/env node
/**
 * Rapporto del banco di confronto: percentuale di vittorie di Creative OS
 * contro ciascun concorrente, in tutto e per famiglia di brief, dalla giuria
 * di modelli (misura principale) e dai giudizi dell'utente se ci sono, più
 * l'accordo tra le due. Scrive rapporto.md e rapporto.json accanto a questo file.
 *
 *   npm run confronto:rapporto
 */
import fs from 'node:fs'
import path from 'node:path'
import { QUI, OUT, GIUDIZI, GIURIA, NOSTRO, caricaBrief, concorrenti, tavola, leggiJsonl, tabellaVittorie, verdettiGiuria, verdettiUtente, accordo, pct } from './lib.mjs'

const brief = caricaBrief()
const famiglie = [...new Set(brief.map(b => b.famiglia))]
const righeGiuria = leggiJsonl(GIURIA), giudizi = leggiJsonl(GIUDIZI)

/* ── concorrenti: chi c'è e chi no ─────────────────────────────────────── */
const nomi = [...new Set([...concorrenti(), ...righeGiuria.map(r => r.concorrente), ...giudizi.map(g => g.concorrente)])]
const stato = Object.fromEntries(nomi.map(c => {
  const f = path.join(OUT, c, 'concorrente.json')
  const s = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : { nome: c, disponibile: true }
  return [c, { ...s, tavole: brief.filter(b => tavola(c, b.id)).length }]
}))
const nostre = brief.filter(b => tavola(NOSTRO, b.id)).length

/* ── conti ─────────────────────────────────────────────────────────────── */
const vg = verdettiGiuria(righeGiuria), vu = verdettiUtente(giudizi)
const giuria = tabellaVittorie([...vg.values()])
const utente = tabellaVittorie(giudizi.map(g => ({ concorrente: g.concorrente, famiglia: g.famiglia, vincitore: g.vincitore ?? null })))
const acc = accordo(vu, vg)
const modelli = [...new Set(righeGiuria.map(r => r.modello))]
const famiglia = id => (id.startsWith('gemini:') || id.includes('google/') || id.includes('gemma') ? 'google' : id.split(':')[1]?.split('/')[0] ?? id)
const unaFamiglia = modelli.length > 1 && new Set(modelli.map(famiglia)).size === 1

/** Il concorrente più forte: quello contro cui Creative OS fa il punteggio più basso. */
const piuForte = t => Object.entries(t).sort((a, b) => a[1].totale.punteggio - b[1].totale.punteggio)[0]?.[0] ?? null

/* ── testo ─────────────────────────────────────────────────────────────── */
const nome = c => stato[c]?.nome ?? c
const riga = c => `${c.vittorie} · ${c.pari} · ${c.sconfitte} (${c.n})`
function tabella(t) {
  const conc = Object.keys(t).sort()
  if (!conc.length) return ['_Nessun giudizio._']
  return [
    `| contro | vittorie | punteggio | V · P · S (coppie) | ${famiglie.join(' | ')} |`,
    `|---|---|---|---|${famiglie.map(() => '---').join('|')}|`,
    ...conc.map(c => `| ${nome(c)} | **${pct(t[c].totale.percentuale)}** | ${pct(t[c].totale.punteggio)} | ${riga(t[c].totale)} | ${famiglie.map(f => (t[c].famiglie[f] ? `${pct(t[c].famiglie[f].percentuale)} (${t[c].famiglie[f].n})` : '—')).join(' | ')} |`),
  ]
}
const forteG = piuForte(giuria), forteU = piuForte(utente)
const obiettivo = (t, c) => (c ? `contro il concorrente più forte (${nome(c)}) Creative OS vince il **${pct(t[c].totale.percentuale)}** delle coppie: obiettivo ${t[c].totale.percentuale > 0.6 ? 'raggiunto' : 'non ancora raggiunto'} (più del 60%).` : '')
const md = [
  '# Banco di confronto: rapporto', '',
  `Aggiornato il ${new Date().toLocaleString('it-IT')}. Fase Q0 di docs/salto-di-qualita.md.`, '',
  '**Vittorie** = coppie vinte da Creative OS su quelle giudicate (le pari contano come non vinte). **Punteggio** = le pari valgono mezza vittoria.', '',
  '## Concorrenti', '',
  `- **Creative OS**: ${nostre} tavole su ${brief.length} brief.`,
  ...nomi.map(c => `- **${nome(c)}** (\`${c}\`): ${stato[c].disponibile === false ? `non disponibile, ${stato[c].motivo}` : `${stato[c].tavole} tavole${stato[c].modelli ? `, modello ${stato[c].modelli[0]}` : ''}`}${stato[c].nota ? `. ${stato[c].nota}` : ''}`),
  '',
  '## Giuria di modelli (misura principale)', '',
  modelli.length ? `Giurati: ${modelli.join(', ')}.${unaFamiglia ? ` **Attenzione: sono tutti della stessa famiglia (${famiglia(modelli[0])})**, quindi possono essere di parte verso il concorrente della stessa casa. Con credito su OpenRouter la giuria prende anche Claude e GPT.` : ''} Ogni giurato vede ogni coppia due volte a posizioni scambiate: una domanda vale solo se le due risposte coincidono, il verdetto del giurato è la maggioranza sulle tre domande, quello della giuria la maggioranza dei giurati.` : '_La giuria non ha ancora giudicato: npm run confronto:giuria._', '',
  ...tabella(giuria), '',
  obiettivo(giuria, forteG), '',
  '## Giudizi dell\'utente', '',
  giudizi.length ? `${giudizi.length} giudizi, sulle coppie dove la giuria era più incerta (quindi non sono un campione rappresentativo: servono soprattutto per l'accordo).` : '_Nessun giudizio dell\'utente (facoltativo): npm run confronto:giudica._', '',
  ...(giudizi.length ? tabella(utente) : []), '',
  '## Accordo tra giuria e utente', '',
  acc.n ? `Sulle ${acc.n} coppie giudicate da entrambi la giuria concorda con l'utente in **${acc.concordi} casi su ${acc.n}** (${pct(acc.percentuale)}). Obiettivo di Q2: almeno 7 su 10.` : '_Serve almeno una coppia giudicata sia dalla giuria sia dall\'utente._',
  ...Object.entries(acc.concorrenti).map(([c, a]) => `- contro ${nome(c)}: ${a.concordi} su ${a.n} (${pct(a.percentuale)})`),
  '',
].join('\n')

fs.writeFileSync(path.join(QUI, 'rapporto.md'), md)
fs.writeFileSync(path.join(QUI, 'rapporto.json'), JSON.stringify({ data: new Date().toISOString(), concorrenti: stato, giuria: { modelli, vittorie: giuria, piuForte: forteG }, utente: { giudizi: giudizi.length, vittorie: utente, piuForte: forteU }, accordo: acc }, null, 2))
console.log(md)
console.log(`Scritto ${path.relative(process.cwd(), path.join(QUI, 'rapporto.md'))}`)
