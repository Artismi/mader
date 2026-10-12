/**
 * I ruoli dell'IA per il motore designer. Ognuno fa un compito piccolo e
 * chiuso, sceglie da menu che il motore sa eseguire e passa dai controlli
 * della maestra. Pensati per reggere anche con modelli gratuiti.
 *
 *   analista  → fatti veri dal brief
 *   regista   → arco e ruoli delle slide (solo caroselli)
 *   copywriter→ testi con i budget di caratteri, tre titoli alternativi
 *   direttore → tre direzioni visive dal menu (sistema, stile, trattamento, regolatori)
 */
import { z } from 'zod'
import { eseguiRuolo, type Giro } from './roles'
import { lunghezza, frasiFatte, numeriInventati, diverse, enfasiNelTitolo, tutti, clean } from './maestra'
import { SISTEMI, TRATTAMENTI } from '@/components/studio/designer/gen/knobs'
import { STYLES } from '@/components/studio/designer/styles'

const LINGUA = 'Scrivi in italiano naturale, come uno studio grafico italiano. Niente punti esclamativi, niente emoji, niente frasi fatte da pubblicità.'
const SOLO_JSON = 'Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo.'

/* ── Analista ─────────────────────────────────────────────────────────── */
export const analisiSchema = z.object({
  brand: z.string().default(''),
  settore: z.string(),
  prodotto: z.string().describe('cosa si comunica: prodotto, evento, servizio'),
  pubblico: z.string(),
  tono: z.array(z.string()).min(2).max(4),
  fatti: z.array(z.string()).min(1).max(8),
  numeri: z.array(z.string()).default([]),
  azione: z.string().default('').describe('cosa deve fare chi guarda'),
  foto: z.string().default('').describe('soggetto fotografabile, 3-6 parole; vuoto se una foto non serve'),
})
export type Analisi = z.infer<typeof analisiSchema>

export async function analista(brief: string, opts: { riservato?: boolean } = {}) {
  return eseguiRuolo({
    ruolo: 'analista', riservato: opts.riservato, schema: analisiSchema, temperature: 0.3,
    system: `Sei l'analista di uno studio grafico. Dal brief estrai solo informazioni vere e presenti: non inventare prezzi, date, numeri o caratteristiche. ${LINGUA} ${SOLO_JSON}`,
    prompt: `Brief:\n"""${brief}"""\n\nRestituisci: {"brand": "nome o vuoto", "settore": "…", "prodotto": "…", "pubblico": "…", "tono": ["2-4 aggettivi"], "fatti": ["frasi brevi e vere, dalla più importante"], "numeri": ["numeri, date, prezzi, misure presenti nel brief, scritti come nel brief"], "azione": "cosa deve fare chi guarda", "foto": "soggetto concreto da fotografare (3-6 parole) o vuoto"}`,
    verifica: a => tutti(
      lunghezza('settore', a.settore, 60, 2), lunghezza('prodotto', a.prodotto, 100, 2),
      a.numeri.flatMap(n => numeriInventati('numeri', n, brief)),
      a.fatti.some(f => clean(f).length > 160) ? ['fatti: ogni fatto deve essere una frase breve (massimo 160 caratteri).'] : [],
    ),
  })
}

/* ── Copywriter (una grafica) ─────────────────────────────────────────── */
/** Budget di caratteri per ruolo del testo. */
export const BUDGET = { titolo: 32, titoloInterno: 48, occhiello: 24, testo: 140, dettaglio: 18, invito: 20, numero: 6 }

export const testiSchema = z.object({
  titoli: z.array(z.object({ testo: z.string(), enfasi: z.string() })).length(3),
  occhiello: z.string().default(''),
  testo: z.string().default(''),
  dettagli: z.array(z.string()).max(3).default([]),
  invito: z.string().default(''),
  numero: z.string().default(''),
})
export type Testi = z.infer<typeof testiSchema>

function controllaTesti(t: Omit<Testi, 'titoli'> & { titoli?: Testi['titoli'] }, fonte: string, maxTitolo: number, pre = ''): string[] {
  const p = (s: string) => (pre ? `${pre} ${s}` : s)
  return tutti(
    (t.titoli ?? []).flatMap((x, i) => tutti(
      lunghezza(p(`titolo ${i + 1}`), x.testo, maxTitolo, 3), frasiFatte(p(`titolo ${i + 1}`), x.testo),
      numeriInventati(p(`titolo ${i + 1}`), x.testo, fonte), enfasiNelTitolo(p(`titolo ${i + 1}`), x.testo, x.enfasi),
    )),
    t.titoli ? diverse(p('titoli'), t.titoli.map(x => x.testo)) : [],
    lunghezza(p('occhiello'), t.occhiello, BUDGET.occhiello), frasiFatte(p('occhiello'), t.occhiello), numeriInventati(p('occhiello'), t.occhiello, fonte),
    lunghezza(p('testo'), t.testo, BUDGET.testo), frasiFatte(p('testo'), t.testo), numeriInventati(p('testo'), t.testo, fonte),
    t.dettagli.flatMap((d, i) => tutti(lunghezza(p(`dettaglio ${i + 1}`), d, BUDGET.dettaglio, 2), numeriInventati(p(`dettaglio ${i + 1}`), d, fonte))),
    lunghezza(p('invito'), t.invito, BUDGET.invito), frasiFatte(p('invito'), t.invito),
    lunghezza(p('numero'), t.numero, BUDGET.numero), numeriInventati(p('numero'), t.numero, fonte),
  )
}

export async function copywriter(brief: string, an: Analisi, opts: { riservato?: boolean } = {}) {
  const fonte = `${brief} ${an.numeri.join(' ')}`
  return eseguiRuolo({
    ruolo: 'copywriter', riservato: opts.riservato, schema: testiSchema, temperature: 0.8,
    system: `Sei il copywriter di uno studio grafico: scrivi testi brevi, concreti, con un'immagine precisa, che si leggono in un secondo su un telefono. ${LINGUA} Usa solo i fatti forniti. ${SOLO_JSON}`,
    prompt: `Analisi del brief:\n${JSON.stringify(an)}\n\nScrivi i testi di una grafica social. Regole:
- 3 titoli DAVVERO diversi (massimo ${BUDGET.titolo} caratteri): uno descrittivo, uno evocativo, uno con un gioco di parole o un contrasto. Per ognuno la parola chiave da evidenziare ("enfasi"), che deve comparire nel titolo.
- occhiello: massimo ${BUDGET.occhiello} caratteri (categoria, data, "Nuovo…").
- testo: massimo ${BUDGET.testo} caratteri, una o due frasi.
- dettagli: da 0 a 3, massimo ${BUDGET.dettaglio} caratteri ciascuno (formato, luogo, orario, prezzo). Solo dati presenti.
- invito: verbo all'imperativo specifico per questo caso, massimo ${BUDGET.invito} caratteri.
- numero: il numero protagonista se c'è nel brief (data, prezzo, percentuale), massimo ${BUDGET.numero} caratteri; altrimenti vuoto.
Formato: {"titoli": [{"testo": "…", "enfasi": "…"}, …], "occhiello": "…", "testo": "…", "dettagli": ["…"], "invito": "…", "numero": "…"}`,
    verifica: t => controllaTesti(t, fonte, BUDGET.titolo),
  })
}

/* ── Regista (caroselli) ──────────────────────────────────────────────── */
export const ARCHI = ['problema-soluzione', 'lista', 'prima-dopo', 'storia', 'annuncio', 'manifesto'] as const
export const RUOLI_SLIDE = ['copertina', 'apertura', 'punto', 'dato', 'citazione', 'confronto', 'elenco', 'immagine', 'chiusura'] as const

export const scalettaSchema = z.object({
  arco: z.enum(ARCHI),
  slides: z.array(z.object({ ruolo: z.enum(RUOLI_SLIDE), idea: z.string(), fatti: z.array(z.string()).default([]) })).min(2).max(10),
})
export type Scaletta = z.infer<typeof scalettaSchema>

export async function regista(an: Analisi, n: number | 'auto', opts: { riservato?: boolean } = {}) {
  return eseguiRuolo({
    ruolo: 'regista', riservato: opts.riservato, schema: scalettaSchema, temperature: 0.6,
    system: `Sei il regista dei caroselli di uno studio grafico: trasformi un contenuto in un discorso a slide, con un inizio che aggancia, uno sviluppo e una chiusura con un invito. ${LINGUA} ${SOLO_JSON}`,
    prompt: `Analisi:\n${JSON.stringify(an)}\n\nScegli l'arco (${ARCHI.join(', ')}) e componi ${n === 'auto' ? 'da 4 a 7' : n} slide.
Ruoli possibili: copertina (la prima, aggancia), apertura (la tesi), punto (un argomento), dato (un numero protagonista, solo se c'è nei fatti), citazione, confronto, elenco, immagine (foto piena, poco testo), chiusura (l'ultima, invito all'azione).
Regole: la prima è "copertina", l'ultima è "chiusura"; non due ruoli uguali di fila (tranne "punto"); "dato" solo con un numero presente nei fatti; ogni slide porta un'idea sola.
Formato: {"arco": "…", "slides": [{"ruolo": "…", "idea": "massimo 90 caratteri", "fatti": ["fatti dell'analisi usati"]}]}`,
    verifica: s => tutti(
      s.slides[0]?.ruolo !== 'copertina' ? ['slides: la prima slide deve essere "copertina".'] : [],
      s.slides.length >= 3 && s.slides[s.slides.length - 1].ruolo !== 'chiusura' ? ['slides: l\'ultima slide deve essere "chiusura".'] : [],
      n !== 'auto' && s.slides.length !== n ? [`slides: servono esattamente ${n} slide, ne hai scritte ${s.slides.length}.`] : [],
      s.slides.some((x, i) => i > 0 && x.ruolo === s.slides[i - 1].ruolo && x.ruolo !== 'punto') ? ['slides: due slide di fila con lo stesso ruolo; alterna.'] : [],
      s.slides.some(x => x.ruolo === 'dato') && !an.numeri.length ? ['slides: non ci sono numeri nel brief, togli le slide "dato".'] : [],
      s.slides.flatMap((x, i) => lunghezza(`slide ${i + 1} idea`, x.idea, 90, 5)),
    ),
  })
}

/* ── Copywriter (carosello: tutte le slide in una chiamata) ───────────── */
export const testiSlideSchema = z.object({
  slides: z.array(z.object({
    titolo: z.string(), enfasi: z.string(), occhiello: z.string().default(''), testo: z.string().default(''),
    dettagli: z.array(z.string()).max(3).default([]), numero: z.string().default(''), invito: z.string().default(''),
  })),
})

export async function copywriterSlide(brief: string, an: Analisi, sc: Scaletta, opts: { riservato?: boolean } = {}) {
  const fonte = `${brief} ${an.numeri.join(' ')}`
  return eseguiRuolo({
    ruolo: 'copywriter', riservato: opts.riservato, schema: testiSlideSchema, temperature: 0.8,
    system: `Sei il copywriter di uno studio grafico: scrivi i testi di un carosello, una slide alla volta, brevi e concreti, che si leggono in un secondo su un telefono. ${LINGUA} Usa solo i fatti forniti. ${SOLO_JSON}`,
    prompt: `Analisi:\n${JSON.stringify(an)}\n\nScaletta (${sc.arco}):\n${sc.slides.map((s, i) => `${i + 1}. ${s.ruolo}: ${s.idea}`).join('\n')}\n\nPer OGNI slide, nello stesso ordine (${sc.slides.length} slide):
- titolo: massimo ${BUDGET.titolo} caratteri in copertina, ${BUDGET.titoloInterno} nelle altre; "enfasi" = parola del titolo da evidenziare.
- occhiello (massimo ${BUDGET.occhiello}), testo (massimo ${BUDGET.testo}, vuoto nelle slide "immagine"), dettagli (0-3, massimo ${BUDGET.dettaglio} ciascuno, solo dati presenti), numero (solo nelle slide "dato", massimo ${BUDGET.numero}), invito (solo in "chiusura", massimo ${BUDGET.invito}).
- titoli tutti diversi tra loro: niente ripetizioni da una slide all'altra.
Formato: {"slides": [{"titolo": "…", "enfasi": "…", "occhiello": "…", "testo": "…", "dettagli": [], "numero": "", "invito": ""}]}`,
    verifica: t => tutti(
      t.slides.length !== sc.slides.length ? [`slides: servono ${sc.slides.length} slide, ne hai scritte ${t.slides.length}.`] : [],
      diverse('titoli delle slide', t.slides.map(s => s.titolo), 0.6),
      t.slides.flatMap((s, i) => controllaTesti({ ...s, titoli: [{ testo: s.titolo, enfasi: s.enfasi }] }, fonte, i === 0 ? BUDGET.titolo : BUDGET.titoloInterno, `slide ${i + 1}:`)),
    ),
  })
}

/* ── Direttore creativo ───────────────────────────────────────────────── */
const SISTEMA_IDS = SISTEMI.map(s => s.id) as [string, ...string[]]
const STILE_IDS = STYLES.map(s => s.id) as [string, ...string[]]
const TRATT_IDS = TRATTAMENTI.map(t => t.id) as [string, ...string[]]
const range = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])

export const direzioniSchema = z.object({
  direzioni: z.array(z.object({
    sistema: z.enum(SISTEMA_IDS), stile: z.enum(STILE_IDS), trattamento: z.enum(TRATT_IDS), inverti: z.boolean().default(false),
    regolatori: z.object({ scala: range, energia: range, densita: range, sovrastampa: range, grana: range }),
    perche: z.string().default(''),
  })).length(3),
})
export type Direzioni = z.infer<typeof direzioniSchema>

const MENU = () => [
  'SISTEMI (composizione):', ...SISTEMI.map(s => `- ${s.id}: ${s.idea}${s.foto === 'serve' ? ' [serve una foto]' : ''}`),
  '', 'STILI (palette e caratteri):', ...STYLES.map(s => `- ${s.id}: ${s.name}, ${s.dark ? 'scuro' : 'chiaro'}; adatto a ${s.keywords.slice(0, 8).join(', ')}`),
  '', `TRATTAMENTI della foto: ${TRATTAMENTI.map(t => `${t.id} (${t.nome})`).join(', ')}`,
  '', 'REGOLATORI (intervalli 0-1): scala (quanto è grande il titolo), energia (diagonali, sfalsamenti), densita (quanti elementi), sovrastampa (inchiostri fuori registro), grana (trama di stampa).',
].join('\n')

export async function direttore(an: Analisi, haFoto: boolean, opts: { riservato?: boolean } = {}) {
  return eseguiRuolo({
    ruolo: 'direttore', riservato: opts.riservato, schema: direzioniSchema, temperature: 0.9,
    system: `Sei il direttore creativo di uno studio grafico con carattere. Scegli tre direzioni visive diverse tra loro, adatte al contenuto e al tono, solo dalle voci del menu. ${SOLO_JSON}`,
    prompt: `${MENU()}\n\nContenuto:\n${JSON.stringify(an)}\nFoto disponibile: ${haFoto ? 'sì' : 'no'}.\n\nProponi 3 direzioni: una coerente e sicura, una più audace, una inaspettata ma sensata. Sistemi tutti diversi. ${haFoto ? '' : 'Niente sistemi che richiedono la foto.'}
Formato: {"direzioni": [{"sistema": "id", "stile": "id", "trattamento": "id", "inverti": false, "regolatori": {"scala": [0.5, 0.8], "energia": [0.2, 0.5], "densita": [0.4, 0.7], "sovrastampa": [0.2, 0.5], "grana": [0.3, 0.6]}, "perche": "una frase"}]}`,
    verifica: d => tutti(
      new Set(d.direzioni.map(x => x.sistema)).size < 3 ? ['direzioni: i tre sistemi devono essere diversi.'] : [],
      !haFoto ? d.direzioni.filter(x => SISTEMI.find(s => s.id === x.sistema)?.foto === 'serve').map(x => `direzioni: "${x.sistema}" richiede una foto, che non c'è. Scegli un altro sistema.`) : [],
      d.direzioni.flatMap((x, i) => Object.entries(x.regolatori).filter(([, [lo, hi]]) => lo > hi).map(([k]) => `direzione ${i + 1}: l'intervallo di ${k} ha il minimo maggiore del massimo.`)),
      d.direzioni.every(x => x.regolatori.energia[1] < 0.4) ? ['direzioni: almeno una direzione deve osare (energia sopra 0.5).'] : [],
    ),
  })
}

/* ── Regia completa ───────────────────────────────────────────────────── */
export interface Regia {
  analisi: Analisi
  testi?: Testi
  scaletta?: Scaletta
  slides?: z.infer<typeof testiSlideSchema>['slides']
  direzioni: Direzioni['direzioni']
  modelli: Record<string, string>
  log: Record<string, Giro[]>
}

/** Brief → analisi → (scaletta) → testi → direzioni. 3 chiamate per una grafica, 4 per un carosello (più le correzioni). */
export async function regia(brief: string, opts: { slides?: number | 'auto'; haFoto?: boolean; riservato?: boolean } = {}): Promise<Regia> {
  const log: Record<string, Giro[]> = {}, modelli: Record<string, string> = {}
  const a = await analista(brief, opts); log.analista = a.log; modelli.analista = a.modello
  const haFoto = opts.haFoto ?? !!a.valore.foto
  const out: Partial<Regia> = { analisi: a.valore }
  if (opts.slides && opts.slides !== 1) {
    const s = await regista(a.valore, opts.slides, opts); log.regista = s.log; modelli.regista = s.modello
    const t = await copywriterSlide(brief, a.valore, s.valore, opts); log.copywriter = t.log; modelli.copywriter = t.modello
    out.scaletta = s.valore; out.slides = t.valore.slides
  } else {
    const t = await copywriter(brief, a.valore, opts); log.copywriter = t.log; modelli.copywriter = t.modello
    out.testi = t.valore
  }
  const d = await direttore(a.valore, haFoto, opts); log.direttore = d.log; modelli.direttore = d.modello
  return { ...(out as Regia), direzioni: d.valore.direzioni, modelli, log }
}
