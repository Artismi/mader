/**
 * Banco di confronto (fase Q0 di docs/salto-di-qualita.md): le parti comuni a
 * genera, giudica, giuria e rapporto. Le funzioni di aggregazione sono pure e
 * hanno i loro test in lib.test.mjs.
 *
 * Vocabolario:
 *   sistema     chi ha fatto la tavola: 'creative-os' o il nome della cartella del concorrente
 *   coppia      Creative OS contro un concorrente sullo stesso brief
 *   vincitore   il sistema che vince la coppia, oppure null (pari)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const QUI = path.dirname(fileURLToPath(import.meta.url))
export const REPO = path.resolve(QUI, '../..')
export const OUT = path.join(QUI, 'out')
export const GIUDIZI = path.join(QUI, 'giudizi.jsonl')
export const GIURIA = path.join(QUI, 'giuria.jsonl')
export const NOSTRO = 'creative-os'
export const IMMAGINI = ['.png', '.jpg', '.jpeg', '.webp']
/** Formato del brief → formato del motore designer. */
export const FORMATI = { '1:1': 'quadrato', '4:5': 'verticale', '9:16': 'storia' }

/** Le domande chiuse della giuria: nessuna chiede "quale è più bella". */
export const DOMANDE = [
  { id: 'lettura', testo: 'Quale si legge prima, guardata di sfuggita su un telefono?' },
  { id: 'protagonista', testo: 'Quale ha un protagonista chiaro, un solo elemento che domina e guida lo sguardo?' },
  { id: 'designer', testo: 'Quale sembra fatta da un designer esperto, non da un modello o da un generatore?' },
]

export function caricaBrief(file = path.join(QUI, 'brief.json')) {
  return JSON.parse(fs.readFileSync(file, 'utf8')).brief
}

/** Il file della tavola di un sistema per un brief (nome file = id del brief), o null. */
export function tavola(sistema, id, out = OUT) {
  for (const ext of IMMAGINI) {
    const f = path.join(out, sistema, id + ext)
    if (fs.existsSync(f)) return f
  }
  return null
}

/** Le cartelle dei concorrenti in out/ (tutte tranne Creative OS e quelle che iniziano con _ o .). */
export function concorrenti(out = OUT) {
  if (!fs.existsSync(out)) return []
  return fs.readdirSync(out, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== NOSTRO && !/^[_.]/.test(d.name))
    .map(d => d.name).sort()
}

/** Le coppie da giudicare: Creative OS contro ogni concorrente, sullo stesso brief, se ci sono entrambe le tavole. */
export function coppie(brief, out = OUT) {
  const lista = []
  for (const conc of concorrenti(out)) {
    for (const b of brief) {
      const nostro = tavola(NOSTRO, b.id, out), loro = tavola(conc, b.id, out)
      if (nostro && loro) lista.push({ brief: b.id, famiglia: b.famiglia, concorrente: conc, nostro, loro })
    }
  }
  return lista
}

export const chiave = (brief, concorrente) => `${brief}|${concorrente}`

/* ── file jsonl ─────────────────────────────────────────────────────────── */
export function leggiJsonl(file) {
  if (!fs.existsSync(file)) return []
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).flatMap(r => {
    try { return [JSON.parse(r)] } catch { return [] }
  })
}

export function aggiungiJsonl(file, riga) {
  fs.appendFileSync(file, JSON.stringify(riga) + '\n')
}

/* ── aggregazione ───────────────────────────────────────────────────────── */

/** Il valore che ha la maggioranza assoluta dei voti (null vale come "pari"); altrimenti null. */
export function maggioranza(voti) {
  if (!voti.length) return null
  const conta = new Map()
  for (const v of voti) conta.set(v ?? null, (conta.get(v ?? null) ?? 0) + 1)
  for (const [v, n] of conta) if (n * 2 > voti.length) return v
  return null
}

/** Due risposte a posizioni scambiate: vale solo se coincidono, altrimenti è il posto che ha deciso e si conta pari. */
export const combinaOrdini = (a, b) => (a === b ? a : null)

const vuota = () => ({ vittorie: 0, pari: 0, sconfitte: 0, n: 0 })
function conta(c, vincitore) {
  c.n++
  if (vincitore === NOSTRO) c.vittorie++
  else if (vincitore == null) c.pari++
  else c.sconfitte++
}
/** Percentuale di vittorie (le pari contano come sconfitte) e punteggio (le pari valgono mezza vittoria). */
export function percentuali(c) {
  return { ...c, percentuale: c.n ? c.vittorie / c.n : null, punteggio: c.n ? (c.vittorie + c.pari / 2) / c.n : null }
}

/**
 * Vittorie di Creative OS contro ciascun concorrente, in tutto e per famiglia di brief.
 * esiti: [{ concorrente, famiglia, vincitore }] → { [concorrente]: { totale, famiglie: { [famiglia]: … } } }
 */
export function tabellaVittorie(esiti) {
  const t = {}
  for (const e of esiti) {
    const r = (t[e.concorrente] ??= { totale: vuota(), famiglie: {} })
    conta(r.totale, e.vincitore)
    conta((r.famiglie[e.famiglia] ??= vuota()), e.vincitore)
  }
  for (const r of Object.values(t)) {
    r.totale = percentuali(r.totale)
    for (const f of Object.keys(r.famiglie)) r.famiglie[f] = percentuali(r.famiglie[f])
  }
  return t
}

/** Il verdetto dell'utente per coppia: la maggioranza dei suoi giudizi su quella coppia. */
export function verdettiUtente(giudizi) {
  const per = new Map()
  for (const g of giudizi) {
    const k = chiave(g.brief, g.concorrente)
    if (!per.has(k)) per.set(k, { brief: g.brief, famiglia: g.famiglia, concorrente: g.concorrente, voti: [] })
    per.get(k).voti.push(g.vincitore ?? null)
  }
  return new Map([...per].map(([k, v]) => [k, { ...v, vincitore: maggioranza(v.voti) }]))
}

/**
 * Il verdetto della giuria per coppia. Ogni riga è la risposta di un modello in un ordine
 * ('nostro-primo' o 'nostro-secondo'), con le risposte già tradotte in sistemi (o null).
 * Per modello: ogni domanda vale solo se i due ordini concordano; il verdetto del modello è
 * la maggioranza sulle domande. Il verdetto della giuria è la maggioranza dei modelli.
 * I modelli a cui manca uno dei due ordini non votano.
 */
export function verdettiGiuria(righe, domande = DOMANDE.map(d => d.id)) {
  const per = new Map()
  for (const r of righe) {
    const k = chiave(r.brief, r.concorrente)
    if (!per.has(k)) per.set(k, { brief: r.brief, famiglia: r.famiglia, concorrente: r.concorrente, modelli: new Map() })
    const m = per.get(k).modelli
    if (!m.has(r.modello)) m.set(r.modello, {})
    m.get(r.modello)[r.ordine] = r.risposte
  }
  const out = new Map()
  for (const [k, v] of per) {
    const modelli = {}
    for (const [modello, ordini] of v.modelli) {
      const a = ordini['nostro-primo'], b = ordini['nostro-secondo']
      if (!a || !b) continue
      const perDomanda = Object.fromEntries(domande.map(d => [d, combinaOrdini(a[d] ?? null, b[d] ?? null)]))
      modelli[modello] = { vincitore: maggioranza(Object.values(perDomanda)), domande: perDomanda }
    }
    const voti = Object.values(modelli).map(m => m.vincitore)
    if (!voti.length) continue
    out.set(k, { brief: v.brief, famiglia: v.famiglia, concorrente: v.concorrente, vincitore: maggioranza(voti), modelli })
  }
  return out
}

/** Accordo tra giuria e utente sulle coppie giudicate da entrambi (pari con pari conta come accordo). */
export function accordo(utente, giuria) {
  const tot = { n: 0, concordi: 0 }, per = {}
  for (const [k, u] of utente) {
    const g = giuria.get(k)
    if (!g) continue
    const c = (per[u.concorrente] ??= { n: 0, concordi: 0 })
    const ok = (u.vincitore ?? null) === (g.vincitore ?? null)
    tot.n++; c.n++
    if (ok) { tot.concordi++; c.concordi++ }
  }
  const pc = x => ({ ...x, percentuale: x.n ? x.concordi / x.n : null })
  return { ...pc(tot), concorrenti: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, pc(v)])) }
}

/**
 * Quanto è incerta la giuria su ogni coppia, da 0 (tutte le risposte dalla stessa parte)
 * a 1 (metà e metà, o tutte pari). Conta ogni risposta di ogni modello, domanda e ordine.
 */
export function incertezzaGiuria(righe) {
  const per = new Map()
  for (const r of righe) {
    const k = chiave(r.brief, r.concorrente)
    const c = per.get(k) ?? { nostro: 0, loro: 0, tot: 0 }
    for (const v of Object.values(r.risposte ?? {})) {
      c.tot++
      if (v === NOSTRO) c.nostro++
      else if (v != null) c.loro++
    }
    per.set(k, c)
  }
  return new Map([...per].map(([k, c]) => [k, c.tot ? 1 - Math.abs(c.nostro - c.loro) / c.tot : 1]))
}

/**
 * Le coppie da far giudicare all'utente: quelle su cui la giuria è più incerta, tra quelle
 * che l'utente non ha ancora giudicato. Le coppie che la giuria non ha visto valgono come le più incerte.
 */
export function coppieIncerte(lista, righeGiuria, giudizi, n = 10, rnd = Math.random) {
  const inc = incertezzaGiuria(righeGiuria)
  const fatte = new Set(giudizi.map(g => chiave(g.brief, g.concorrente)))
  return mescola(lista.filter(c => !fatte.has(chiave(c.brief, c.concorrente))), rnd)
    .sort((a, b) => (inc.get(chiave(b.brief, b.concorrente)) ?? 1) - (inc.get(chiave(a.brief, a.concorrente)) ?? 1))
    .slice(0, n)
}

/** Mescola sul posto (Fisher-Yates); rnd iniettabile per i test. */
export function mescola(lista, rnd = Math.random) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
  }
  return lista
}

/** La prossima coppia da mostrare: una a caso tra quelle giudicate meno volte. */
export function prossimaCoppia(lista, giudizi, rnd = Math.random) {
  if (!lista.length) return null
  const volte = new Map()
  for (const g of giudizi) volte.set(chiave(g.brief, g.concorrente), (volte.get(chiave(g.brief, g.concorrente)) ?? 0) + 1)
  const min = Math.min(...lista.map(c => volte.get(chiave(c.brief, c.concorrente)) ?? 0))
  const meno = lista.filter(c => (volte.get(chiave(c.brief, c.concorrente)) ?? 0) === min)
  return meno[Math.floor(rnd() * meno.length)]
}

export const pct = x => (x == null ? '—' : `${Math.round(x * 100)}%`)
