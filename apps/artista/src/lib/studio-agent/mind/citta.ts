// La città interna, strato 2: il paese osserva.
// Gli abitanti nascono dal territorio (mestieri dalle mani, teste dai temi), hanno un carattere e una storia,
// camminano tra le tavole vecchie, accumulano tensioni e parlano solo quando superano la loro soglia.
// Tutto quello che succede finisce nella rete di memoria (nodi con un vettore di significato).
// Le regole che li definiscono sono dati (REGOLE): le possono leggere, e negli strati successivi proporre di cambiarle.
// In questo strato non decidono niente: scrivono il verbale.

import { territorio, radice, type Opera, type Territorio, type Insieme } from './territorio'
import { campagna, SCIENZIATI, type CosmoAPI, type Osservatorio } from './osservatorio'

// ── le regole: visibili a tutti, scritte come dati ──────────────────────────────────────────────────────────
export const REGOLE_INIZIALI = {
  soglia: 1.0,              // carica oltre la quale si parla
  calo: 0.85,               // quanto si sgonfia la carica a ogni fase senza parlare
  passiCammino: 9,          // quante tavole si incontrano per strada
  deviazione: 0.35,         // quanto il cammino preferisce le strade interessanti alla più breve
  salto: 1.6,               // urgenza oltre la quale si salta in un'altra cella del ciclo
  pesoTema: 0.6,            // pertinenza: quanto conta il tema rispetto al nome
  ripetizione: 4,           // quante volte una stessa frase in un quartiere prima che sembri un ciclo chiuso
  troppoGrande: 0.12,       // quota di tavole oltre cui un quartiere pare troppo pieno
  guizzo: 0.04,             // probabilità di base del guizzo (si moltiplica per il carattere)
}
export type Regole = typeof REGOLE_INIZIALI

export const CELLE = ['casa', 'cammino', 'piazza', 'osservatorio', 'biblioteca', 'ritorno', 'bottega', 'assemblea', 'archivio'] as const
export type Cella = typeof CELLE[number]
const TUTTI_IN: Cella[] = ['assemblea'] // fasi che richiamano tutti

export type Carattere = { credulone: number; testardo: number; contrario: number; prudente: number; trascinatore: number; ironico: number; malinconico: number; visionario: number }
export type Abitante = {
  id: string; nome: string; tipo: 'mestiere' | 'testa' | 'figura' | 'scienziato'; carica: string // la carica: ruolo nella città
  carattere: Carattere; interessi: Record<string, number>; casa: { x: number; y: number }; raggio: number
  cella: Cella; tensione: number; peso: Record<string, number>; storia: string[]; visti: string[]
  fonti?: Record<string, number> // la sua tavolozza di siti: si allarga e si restringe con l'uso
}
export type Lettura = { url?: string; source?: string; title?: string; text?: string }
export type Cerca = (fonte: string, q: string, n: number) => Promise<Lettura[]>
// il catalogo (lo stesso del server: server/fonti.ts)
export const CATALOGO = ['wiki-it', 'wiki-en', 'wiki-fr', 'wiki-de', 'wiki-es', 'wikisource', 'wikizionario', 'wikiquote', 'commons', 'openlibrary', 'gutenberg', 'archive', 'arxiv',
  'rivista:Il Post', 'rivista:Internazionale', 'rivista:Doppiozero', 'rivista:Il Tascabile', 'rivista:cheFare', 'rivista:Artribune', 'rivista:Le Scienze', 'rivista:Scienza in Rete', 'rivista:minima&moralia', 'rivista:Nazione Indiana']
const SCIENTIFICI = new Set(['alchimista', 'ottico', 'geometra', 'giardiniere'])
export type Nodo = { id: string; giorno: number; tipo: string; testo: string; chi?: string; vettore: Record<string, number>; legami: string[]; dove?: string[] }
export type Evento = { tipo: string; testo: string; nucleo?: string; argomento?: string; chi?: string; tema: Record<string, number>; nomi: string[]; tavole?: string[]; peso: number; dati?: any }
export type Battuta = { fase: Cella; chi: string; a?: string; tipo: string; testo: string }
export type Azione = { tipo: 'sospendi'; frase: string } | { tipo: 'solo'; mestiere: string; strumenti: string[] } | { tipo: 'nome'; nome: string } | { tipo: 'nota' }
export type Piano = { giorno: number; chi: string; cosa: string; stato: string; argomento?: string; azione?: Azione; voti?: { pro: number; contro: number } }
export type Decisione = { id: string; giorno: number; giornoAgente: number; chi: string; cosa: string; tipo: Azione['tipo']; param: Record<string, unknown>; fino: number; stato: 'in vigore' | 'scaduta' | 'revocata'; favorevoli: string[]; prima?: number; esito?: string }
export type Commissione = import('./sospese').Commissione
export type Mostra = { giorno: number; curatore: string; opere: { id: string; titolo: string; autore: string; perche: string }[] }
export type RichiestaOfficina = { autore: string; scopo: string; strumenti: string[]; modo: 'zero' | 'ramo' | 'innesto'; base?: string; giorno: number }
export type EsitoOfficina = { autore: string; nome: string; testo: string; tenuto: boolean; perche: string; scopo: string; giorno: number; discusso?: boolean }
export type Cantiere = { id: string; giorno: number; chi: string; cosa: string; passi: { testo: string; dove: 'biblioteca' | 'bottega' | 'officina' | 'sito'; stato: 'da fare' | 'fatto' | 'aspetta' }[] }
export type Citta = { osservatorio?: Osservatorio; officina?: { richieste: RichiestaOfficina[]; esiti: EsitoOfficina[]; tenuti: { id: string; nome: string; autore: string; punteggio: number }[] }; cantieri?: Cantiere[]; bottega?: Commissione[]; mostre?: Mostra[]; mancanti?: { giorno: number; chi: string; cosa: string }[]; nome: string | null; giorno: number; regole: Regole; abitanti: Abitante[]; rete: Nodo[]; piani: Piano[]; domande: { giorno: number; chi: string; testo: string; stato: string; risposta?: string }[]; decisioni?: Decisione[]; credito?: Record<string, Record<string, number>> }

function caso(seme: number) { let z = seme >>> 0; return () => { z = (z + 0x6d2b79f5) >>> 0; let t = z; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const cos = (a: Record<string, number>, b: Record<string, number>) => { let s = 0, na = 0, nb = 0; for (const k in a) { na += a[k] ** 2; if (b[k]) s += a[k] * b[k] } for (const k in b) nb += b[k] ** 2; return s / (Math.sqrt(na * nb) || 1) }
const vettoreDi = (t: string) => { const v: Record<string, number> = {}; for (const w of String(t).toLowerCase().split(/[^a-zàèéìòù]+/)) if (w.length >= 5) { const k = radice(w); if (k) v[k] = (v[k] ?? 0) + 1 } return v }

// ── nascita: dagli insiemi del territorio, con un carattere che viene dal suo modo di stare al mondo ─────────
function carattereDi(r: () => number, ins?: Insieme): Carattere {
  const t = () => { const x = r(); return x < 0.08 ? 0.85 + r() * 0.15 : 0.15 + r() * 0.5 } // quasi sempre moderato, a volte estremo
  const c: Carattere = { credulone: t(), testardo: t(), contrario: t(), prudente: t(), trascinatore: t(), ironico: t(), malinconico: t(), visionario: t() }
  if (ins) { // chi ha un insieme largo e sparso è più visionario, chi l'ha stretto più testardo
    const largo = Math.min(1, ins.raggio / 400)
    c.visionario = Math.min(1, c.visionario * 0.6 + largo * 0.5); c.testardo = Math.min(1, c.testardo * 0.6 + (1 - largo) * 0.4)
  }
  return c
}

export function fondaCitta(opere: Opera[], T: Territorio, seme = 11): Citta {
  const r = caso(seme)
  const abitanti: Abitante[] = T.insiemi.map(ins => {
    const ab = ins.abitante
    const interessi: Record<string, number> = {}
    if (ab.tipo === 'testa') ab.parole!.forEach((k, i) => interessi[k] = i ? 0.5 : 1)
    else { for (const s of ab.strumenti!) interessi['m:' + s] = 1; for (const q of ins.quartieri) for (const c of T.quartieri.find(x => x.id === q)?.concetti ?? []) { const k = radice(c); if (k) interessi[k] = (interessi[k] ?? 0) + 0.3 } }
    return { id: ab.id, nome: ab.nome, tipo: ab.tipo, carica: ab.tipo === 'mestiere' ? 'artigiano' : 'pensatore', carattere: carattereDi(r, ins), interessi, casa: ins.casa, raggio: ins.raggio, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [] }
  })
  // le figure: chi guarda il tutto (il critico e il curatore ci sono già nel giro; qui chi guarda la città)
  const urb: Abitante = { id: 'urbanista', nome: "l'urbanista", tipo: 'figura', carica: 'urbanista', carattere: carattereDi(r), interessi: { citt: 1, spazi: 0.6, quartier: 0.6, strad: 0.5 }, casa: T.piazza, raggio: 300, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [] }
  const arch: Abitante = { id: 'archivio', nome: "l'archivio", tipo: 'figura', carica: 'memoria', carattere: { ...carattereDi(r), malinconico: 0.8, testardo: 0.7 }, interessi: { memori: 1, ripet: 1, tempo: 0.5 }, casa: T.piazza, raggio: 500, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [] }
  const cur: Abitante = { id: 'curatore', nome: 'il curatore', tipo: 'figura', carica: 'curatore', carattere: { ...carattereDi(r), prudente: 0.6 }, interessi: { mostr: 1, tavol: 0.6, sal: 0.5 }, casa: T.piazza, raggio: 300, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [] }
  const sag: Abitante = { id: 'saggista', nome: 'la saggista', tipo: 'figura', carica: 'saggista', carattere: { ...carattereDi(r), prudente: 0.7, credulone: 0.2 }, interessi: {}, casa: T.piazza, raggio: 200, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [] }
  const C: Citta = { nome: null, giorno: 0, regole: { ...REGOLE_INIZIALI }, abitanti: [...abitanti, urb, arch, sag, cur], rete: [], piani: [], domande: [] }
  for (const a of C.abitanti) tavolozza(a, r)
  return C
}

/** la tavolozza di partenza di un abitante: dipende da chi è, con un po' di caso */
export function tavolozza(a: Abitante, r: () => number) {
  if (a.fonti) return a.fonti
  const f: Record<string, number> = { 'wiki-it': 1 }
  const riviste = CATALOGO.filter(x => x.startsWith('rivista:'))
  const uno = (l: string[]) => l[Math.floor(r() * l.length)]
  if (a.tipo === 'testa') { f.wikisource = 0.6; f[uno(riviste)] = 0.7; f[uno(riviste)] = 0.5; f[uno(['wiki-en', 'wiki-fr', 'wiki-de', 'wiki-es'])] = 0.5 }
  else if (a.tipo === 'mestiere') { f.commons = 0.7; f['wiki-en'] = 0.5; if (SCIENTIFICI.has(a.id)) f.arxiv = 0.6; if (a.id === 'tipografo' || a.id === 'redattore') { f.wikizionario = 0.7; f.wikiquote = 0.4 } }
  else if (a.id === 'urbanista') { f[uno(riviste)] = 0.8; f[uno(riviste)] = 0.6; f['wiki-en'] = 0.5 }
  else if (a.id === 'archivio') { f.wikisource = 0.8; f.archive = 0.7; f.gutenberg = 0.5 }
  else if (a.id === 'saggista') for (const x of CATALOGO) f[x] = 0.5 + r() * 0.3
  return a.fonti = f
}

// ── osservazioni sui dati: cose vere che si possono notare camminando ───────────────────────────────────────
const FUNZ = new Set('il lo la i gli le un uno una di a da in con su per tra fra e o ma che non è più come se'.split(' '))
function frasiRipetute(titoli: string[], min: number) {
  const c = new Map<string, number>()
  for (const t of titoli) {
    const w = String(t).toLowerCase().replace(/[«»"“”:·—–\-,.!?;()]/g, ' ').split(/\s+/).filter(Boolean)
    const visti = new Set<string>()
    for (let n = 3; n <= 5; n++) for (let i = 0; i + n <= w.length; i++) { const g = w.slice(i, i + n); if (g.filter(x => !FUNZ.has(x)).length < 1 || FUNZ.has(g[0]) && FUNZ.has(g[n - 1])) continue; const k = g.join(' '); if (!visti.has(k)) { visti.add(k); c.set(k, (c.get(k) ?? 0) + 1) } }
  }
  // tieni le più lunghe che non sono contenute in un'altra con lo stesso conto
  const tutte = [...c].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
  const tenute: [string, number][] = []
  for (const [k, n] of tutte) if (!tenute.some(([t, m]) => t.includes(k) && m >= n * 0.8)) tenute.push([k, n])
  return tenute.slice(0, 5)
}

// ── la giornata ────────────────────────────────────────────────────────────────────────────────────────────
export async function giornata(C: Citta, opere: Opera[], T: Territorio, o: { seme?: number; letture?: Lettura[]; cerca?: Cerca; ricerche?: number; giornoAgente?: number; durata?: number; strumenti?: string[]; cosmo?: CosmoAPI } = {}) {
  const r = caso((o.seme ?? 1) ^ (C.giorno * 2654435761))
  const R = C.regole, idx = new Map(opere.map((w, i) => [w.id, i]))
  C.giorno++
  // il territorio si muove con le tavole nuove: le case e i cerchi si aggiornano; chi è nato oggi si aggiunge
  for (const ins of T.insiemi) {
    const a = C.abitanti.find(x => x.id === ins.abitante.id)
    if (a) { a.casa = ins.casa; a.raggio = ins.raggio }
    else C.abitanti.push({ ...fondaCitta(opere, { ...T, insiemi: [ins] }, C.giorno).abitanti[0], storia: [`nato il giorno ${C.giorno}`] })
  }
  if (!C.abitanti.some(a => a.id === 'saggista')) C.abitanti.push({ id: 'saggista', nome: 'la saggista', tipo: 'figura', carica: 'saggista', carattere: { ...carattereDi(r), prudente: 0.7 }, interessi: {}, casa: T.piazza, raggio: 200, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [] })
  if (!C.abitanti.some(a => a.id === 'curatore')) C.abitanti.push({ id: 'curatore', nome: 'il curatore', tipo: 'figura', carica: 'curatore', carattere: { ...carattereDi(r), prudente: 0.6 }, interessi: { mostr: 1, tavol: 0.6 }, casa: T.piazza, raggio: 300, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [] })
  for (const sc of SCIENZIATI) if (!C.abitanti.some(a => a.id === sc.id)) C.abitanti.push({ id: sc.id, nome: sc.nome, tipo: 'scienziato', carica: sc.id === 'filosofa' ? 'filosofa della scienza' : 'osservatorio', carattere: { ...carattereDi(r), prudente: sc.id === 'filosofa' ? 0.4 : 0.65 }, interessi: { ...sc.interessi }, casa: T.piazza, raggio: 260, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [], fonti: sc.id === 'filosofa' ? { 'wiki-it': 1, 'wiki-en': 0.7, wikisource: 0.6, 'rivista:Doppiozero': 0.5 } : { 'wiki-en': 1, arxiv: 1, 'rivista:Le Scienze': 0.7, 'rivista:Scienza in Rete': 0.5, 'wiki-it': 0.5 } })
  for (const a of C.abitanti) tavolozza(a, r)
  const verbale: Battuta[] = []
  const coda: Evento[] = []
  const nota = (tipo: string, testo: string, chi?: string, dove?: string[], vettore?: Record<string, number>) => {
    const v = vettore ?? vettoreDi(testo)
    const vicini = C.rete.map(n => [n.id, cos(v, n.vettore)] as [string, number]).filter(e => e[1] > 0.25).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0])
    const n: Nodo = { id: `n${C.giorno}.${C.rete.length}`, giorno: C.giorno, tipo, testo, chi, vettore: v, legami: vicini, dove }
    C.rete.push(n); return n
  }
  const ab = (id: string) => C.abitanti.find(a => a.id === id)!
  const quart = (id: string) => T.quartieri.find(q => q.id === T.punti[idx.get(id)!]?.q)

  // pertinenza di un evento per un abitante: il tema, il suo nome, le sue tavole, il suo carattere
  const pertinenza = (a: Abitante, e: Evento) => {
    let p = R.pesoTema * cos(a.interessi, e.tema)
    if (e.nomi.includes(a.id)) p += 1.2
    if (e.chi === a.id) p = 0
    const ins = T.insiemi.find(s => s.abitante.id === a.id)
    if (ins && e.tavole) p += e.tavole.reduce((s, t) => s + (ins.membri[t] ?? 0), 0) / Math.max(1, e.tavole.length)
    if (e.chi && a.peso[e.chi] !== undefined) p += Math.abs(a.peso[e.chi]) * 0.4 // chi ti ha contraddetto o dato ragione ti tocca di più
    return p * e.peso
  }
  // il carattere decide come si reagisce
  const reazione = (a: Abitante, e: Evento) => {
    const c = a.carattere
    const pesi: [string, number][] = [
      ['concorda', c.credulone + 0.3], ['obietta', c.testardo * 0.8 + 0.2], ['rovescia', c.contrario], ['chiede', c.prudente * 0.8 + 0.2],
      ['scherza', c.ironico * 0.6], ['ricorda', c.malinconico * 0.7], ['propone', c.trascinatore * 0.6 + (e.tipo === 'problema' ? 0.6 : 0)],
    ]
    if (e.chi && (a.peso[e.chi] ?? 0) < -0.3) pesi.push(['obietta', 0.8])
    let x = r() * pesi.reduce((s, p) => s + p[1], 0); for (const [k, w] of pesi) if ((x -= w) <= 0) return k; return 'concorda'
  }
  const di = (id?: string) => id ? ab(id)?.nome ?? id : 'qualcuno'
  const a_ = (nome: string) => nome.replace(/^il /, 'al ').replace(/^lo /, 'allo ').replace(/^la /, 'alla ').replace(/^l'/, "all'").replace(/^chi /, 'a chi ')
  const del_ = (nome: string) => nome.replace(/^il /, 'del ').replace(/^lo /, 'dello ').replace(/^la /, 'della ').replace(/^l'/, "dell'").replace(/^chi /, 'di chi ')
  const detti = new Set(C.rete.filter(n => n.giorno >= C.giorno - 3 && n.tipo === 'battuta').map(n => n.testo))
  const giaSu = new Map<string, Set<string>>() // argomento → chi ha già parlato oggi
  const posizioni = new Map<string, Map<string, number>>() // argomento → chi era a favore (+1) o contro (-1)
  const uno = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  // dal suo punto di vista: un dato suo sulle tavole dell'evento
  const mio = (a: Abitante, e: Evento) => {
    const ins = T.insiemi.find(s => s.abitante.id === a.id)
    const t = e.tavole ?? []
    if (!ins || !t.length) return null
    const k = t.filter(x => (ins.membri[x] ?? 0) > 0.15).length
    return { k, n: t.length }
  }
  const voce = (a: Abitante) => a.tipo === 'mestiere' ? `Le mie mani (${(T.insiemi.find(s => s.abitante.id === a.id)?.abitante.strumenti ?? []).slice(0, 2).join(', ')}) non lo vedono così` : a.tipo === 'testa' ? `Chi pensa come me non la vede così` : `Dalla mappa non sembra così`
  const frasi = (a: Abitante, e: Evento, tipo: string): string[] => {
    const nu = e.nucleo ?? e.testo, m = mio(a, e), d = e.dati ?? {}
    const parte = m ? (m.k === 0 ? `nessuna di quelle ${m.n} è mia` : m.k === m.n ? `sono tutte mie, tutte ${m.n}` : `${m.k} su ${m.n} sono mie`) : null
    switch (tipo) {
      case 'concorda': return [
        parte ? `Ha ragione ${di(e.chi)}, e ${parte}.` : `Ha ragione ${di(e.chi)}.`,
        parte ? `${parte.charAt(0).toUpperCase() + parte.slice(1)}: lo sento anch'io.` : `Lo sento anch'io, ${nu}.`,
        `Sì. ${a.tipo === 'mestiere' ? 'Si vede anche dalle mani: fanno sempre gli stessi gesti.' : a.tipo === 'testa' ? 'Anche i miei pensieri finiscono lì.' : 'Si vede dalla mappa.'}`,
      ]
      case 'obietta': return [
        d.obiezione, parte && m!.k === 0 ? `Non mi riguarda: ${parte}. Guardate altrove prima di cambiare tutto.` : null,
        `Calma. ${voce(a)}.`,
        d.controprova,
      ].filter(Boolean) as string[]
      case 'rovescia': return [d.rovescio, `E se il punto fosse proprio questo, e fosse da spingere invece che da correggere?`].filter(Boolean) as string[]
      case 'chiede': { const so = d.soggetto ?? nu; return [d.domanda, `Da quando ${so}?`, `Chi ha cominciato, con ${so}?`].filter(Boolean) as string[] }
      case 'scherza': return [d.battuta, `Mettiamoci una targa e non se ne parla più.`, `Prima o poi diventa un'opera concettuale.`].filter(Boolean) as string[]
      case 'ricorda': {
        const vecchia = C.rete.filter(n => n.giorno < C.giorno && n.chi && n.chi !== a.id && n.tipo !== 'cammino').map(n => [n, cos(e.tema, n.vettore)] as const).filter(x => x[1] > 0.2).sort((x, y) => y[1] - x[1])[0]
        return vecchia ? [`Il giorno ${vecchia[0].giorno} ${di(vecchia[0].chi)} diceva: «${vecchia[0].testo.slice(0, 110)}». Siamo ancora lì.`] : []
      }
      case 'propone': return [d.proposta].filter(Boolean) as string[]
    }
    return []
  }
  const parla = (a: Abitante, e: Evento, fase: Cella): Evento | null => {
    const arg = e.argomento ?? e.testo
    const gia = giaSu.get(arg) ?? new Set(); giaSu.set(arg, gia)
    if (gia.has(a.id) && !e.nomi.includes(a.id)) { a.tensione *= 0.5; return null } // ha già detto la sua su questo
    let tipo = reazione(a, e), testo = ''
    for (let t = 0; t < 4 && !testo; t++) {
      const cand = frasi(a, e, tipo).filter(f => f && !detti.has(f))
      if (cand.length) testo = uno(cand); else tipo = reazione(a, e)
    }
    if (!testo) { a.tensione *= 0.5; return null } // non ha niente di nuovo da dire: sta zitto
    detti.add(testo); gia.add(a.id)
    verbale.push({ fase, chi: a.id, a: e.chi, tipo, testo })
    a.tensione = 0; a.storia.push(`${C.giorno}:${tipo}`)
    if (e.chi) a.peso[e.chi] = Math.max(-1, Math.min(1, (a.peso[e.chi] ?? 0) + (tipo === 'concorda' ? 0.2 : tipo === 'obietta' || tipo === 'rovescia' ? -0.2 : 0)))
    nota('battuta', testo, a.id, e.tavole, { ...e.tema, ...vettoreDi(testo) })
    if (tipo === 'chiede') C.domande.push({ giorno: C.giorno, chi: a.id, testo, stato: 'aperta', argomento: e.argomento, cerca: e.dati?.cerca } as any)
    if (tipo === 'propone' && !C.piani.some(p => p.cosa === testo && p.stato !== 'chiuso')) C.piani.push({ giorno: C.giorno, chi: a.id, cosa: testo, stato: 'proposto', argomento: e.argomento, azione: e.dati?.azione })
    if (e.argomento) { const pos = posizioni.get(e.argomento) ?? new Map<string, number>(); posizioni.set(e.argomento, pos); pos.set(a.id, tipo === 'concorda' || tipo === 'propone' ? 1 : tipo === 'obietta' || tipo === 'rovescia' ? -1 : 0) }
    return { ...e, tipo: 'battuta', testo, chi: a.id, nomi: e.chi ? [e.chi] : [], peso: e.peso * 0.7 }
  }
  // un giro di discussione: ognuno accumula, parla chi supera la soglia; si ferma quando nessuno la supera più
  const discuti = (fase: Cella, presenti: Abitante[], max = 18) => {
    let giri = 0
    while (coda.length && giri++ < max) {
      const e = coda.shift()!
      for (const a of presenti) a.tensione += pertinenza(a, e) * (0.6 + a.carattere.trascinatore * 0.6)
      const pronti = presenti.filter(a => a.tensione > R.soglia * (0.7 + a.carattere.prudente * 0.6)).sort((x, y) => y.tensione - x.tensione).slice(0, 2)
      for (const a of pronti) { const nuovo = parla(a, e, fase); if (nuovo) coda.push(nuovo) }
      for (const a of presenti) a.tensione *= R.calo
    }
    coda.length = 0
  }

  // 1. casa → cammino: ognuno va in piazza per una strada diversa, passando da tavole che hanno qualcosa da dirgli
  const P = T.punti, adj: number[][] = P.map(() => [])
  for (const [a, b] of T.fili) { adj[a].push(b); adj[b].push(a) }
  const vicinoA = (x: number, y: number) => { let bi = 0, bd = 1e18; P.forEach((p, i) => { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; bi = i } }); return bi }
  const fine = vicinoA(T.piazza.x, T.piazza.y)
  const osservazioni: Evento[] = []
  for (const a of C.abitanti) {
    a.cella = 'cammino'
    let i = vicinoA(a.casa.x + (r() - 0.5) * 60, a.casa.y + (r() - 0.5) * 60)
    const strada: number[] = [i]
    for (let passo = 0; passo < R.passiCammino && i !== fine; passo++) {
      const dFine = (j: number) => Math.hypot(P[j].x - P[fine].x, P[j].y - P[fine].y)
      const op = adj[i].filter(j => !strada.includes(j))
      if (!op.length) break
      // la strada interessante: avvicina alla piazza, ma vale di più una tavola non vista, del suo insieme, piaciuta
      const ins = T.insiemi.find(s => s.abitante.id === a.id)
      const voto = (j: number) => -dFine(j) / 100 + R.deviazione * ((a.visti.includes(P[j].id) ? -1 : 1) + (ins?.membri[P[j].id] ?? 0) * 2 + P[j].peso) + r() * 0.5
      i = op.sort((x, y) => voto(y) - voto(x))[0]; strada.push(i)
    }
    a.visti = [...a.visti, ...strada.map(j => P[j].id)].slice(-200)
    // cosa nota per strada: una tavola del suo insieme vista dopo tanto tempo, una tavola molto piaciuta, una brutta nel suo quartiere
    for (const j of strada) {
      const w = opere[idx.get(P[j].id)!]
      if (!w) continue
      const ins = T.insiemi.find(s => s.abitante.id === a.id)
      if ((ins?.membri[w.id] ?? 0) > 0.5 && (w.interest ?? 0) > 0.85 && r() < 0.5) osservazioni.push({ tipo: 'ricordo', chi: a.id, testo: `Passando ho rivisto «${w.title}» (giorno ${w.day}): era tra le migliori delle mie, e non l'abbiamo più ripresa.`, nucleo: `«${w.title}» era buona e l'abbiamo lasciata`, argomento: 'ricordo:' + w.id, tema: vettoreDi(`${w.title} ${w.intention?.word ?? ''}`), nomi: [], tavole: [w.id], peso: 0.8, dati: { domanda: `Perché «${w.title}» funzionava e non l'abbiamo più ripresa?`, proposta: `Ripartire da «${w.title}» in bottega, con le mani di oggi.` } })
    }
    nota('cammino', `${a.nome} è passato da ${strada.length} tavole: ${strada.slice(0, 4).map(j => `«${P[j].titolo.slice(0, 40)}»`).join(', ')}…`, a.id, strada.map(j => P[j].id))
  }

  // 2. piazza: le cose vere della città, viste da chi le può vedere
  const tot = P.length
  // cicli chiusi: frasi che tornano nei titoli recenti
  const recenti = opere.slice(-160)
  const giaVisti = new Set<string>()
  for (const [frase, n] of frasiRipetute(recenti.map(w => w.title ?? ''), R.ripetizione)) {
    if ([...giaVisti].some(g => g.includes(frase) || frase.includes(g))) continue
    if ((C.decisioni ?? []).some(d => d.tipo === 'sospendi' && d.stato === 'in vigore' && (frase.includes(String(d.param.frase)) || String(d.param.frase).includes(frase)))) continue // ci abbiamo già messo mano
    giaVisti.add(frase)
    const tav = recenti.filter(w => String(w.title).toLowerCase().includes(frase)).map(w => w.id)
    osservazioni.push({ tipo: 'problema', chi: 'archivio', testo: `Nelle ultime ${recenti.length} tavole «${frase}» torna ${n} volte. Stiamo girando in tondo.`, nucleo: `«${frase}» torna troppo`, argomento: 'frase:' + frase, tema: vettoreDi(frase), nomi: ['tipografo', 'redattore'], tavole: tav, peso: 1.2, dati: { azione: { tipo: 'sospendi', frase }, soggetto: `torna «${frase}»`, domanda: `Cosa ci porta a ridire «${frase}»?`, proposta: `Per un po' «${frase}» non si scrive: chi la sente tornare la sostituisce con quello che ha visto davvero.`, rovescio: `Forse ripetere «${frase}» non è il male: il male è ripeterla uguale.`, battuta: `«${frase}» ormai ha una via col suo nome.`, obiezione: `Una frase che torna è anche una firma. Toglierla tutta ci rende anonimi.` } })
  }
  // quartieri troppo pieni
  for (const q of T.quartieri) if (q.n / tot > R.troppoGrande) osservazioni.push({ tipo: 'problema', chi: 'urbanista', testo: `Il quartiere «${q.nome}» ha ${q.n} tavole su ${tot}: è diventato una periferia senza centro.`, nucleo: `«${q.nome}» è troppo pieno`, argomento: 'quartiere:' + q.id, tema: Object.fromEntries(q.concetti.map(c => [radice(c) ?? c, 1])), nomi: [], peso: 1, dati: { cerca: q.concetti.slice(0, 2).join(' '), proposta: `Dividere «${q.nome}» in due rioni seguendo le sue due parole: ${q.concetti.slice(0, 2).join(' / ')}.`, domanda: `Perché finiamo sempre in «${q.nome}»?` } })
  // case sovrapposte
  const mest = T.insiemi.filter(s => s.abitante.tipo === 'mestiere')
  const ammucchiati = mest.filter(s => mest.filter(t => Math.hypot(t.casa.x - s.casa.x, t.casa.y - s.casa.y) < 60).length >= 4)
  if (ammucchiati.length >= 4) osservazioni.push({ tipo: 'problema', chi: 'urbanista', testo: `${ammucchiati.length} mestieri abitano nello stesso isolato: ${ammucchiati.map(s => s.abitante.nome).join(', ')}. Le mani lavorano sempre insieme, non c'è una zona di nessuno.`, nucleo: 'i mestieri stanno tutti nello stesso isolato', argomento: 'case', tema: { mani: 1, cas: 1 }, nomi: ammucchiati.map(s => s.abitante.id), peso: 1, dati: { cerca: 'divisione del lavoro artigiano', proposta: `Ogni mestiere prova una tavola da solo, senza gli altri, per vedere che terreno è suo.`, rovescio: `O forse è bello così: una bottega comune.` } })
  // mestieri a digiuno
  for (const s of mest) if (s.n < tot * 0.03) osservazioni.push({ tipo: 'problema', chi: s.abitante.id, testo: `Le mie mani le avete usate in ${s.n} tavole su ${tot}. ${s.abitante.strumenti!.join(', ')}: quasi mai.`, nucleo: `${s.abitante.nome} lavora quasi mai`, argomento: 'digiuno:' + s.abitante.id, tema: Object.fromEntries(s.abitante.strumenti!.map(x => ['m:' + x, 1])), nomi: [], peso: 1.1, dati: { azione: { tipo: 'solo', mestiere: s.abitante.id, strumenti: s.abitante.strumenti! }, cerca: s.abitante.strumenti!.slice(0, 2).join(' '), proposta: `Una tavola dove comincia ${s.abitante.nome} e gli altri seguono.`, domanda: `Cosa sanno fare ${s.abitante.strumenti!.slice(0, 3).join(', ')} che nessun altro fa?` } })

  // l'officina di ieri: i programmi provati tornano in piazza (tenuti o buttati, con la causa)
  for (const e of (C.officina?.esiti ?? []).filter(x => !x.discusso).slice(-3)) {
    e.discusso = true
    osservazioni.push({ tipo: 'officina', chi: e.autore, testo: e.tenuto ? `In officina ho scritto «${e.nome}»: ${e.perche}. Ora è uno strumento di tutti: ${e.testo.slice(0, 140)}` : `Ho provato «${e.nome}» in officina e l'ho buttato: ${e.perche}. Lo scrivo così non lo rifacciamo.`, nucleo: `il programma «${e.nome}»`, argomento: 'officina:' + e.nome, tema: vettoreDi(`${e.scopo} ${e.testo}`), nomi: [], peso: 1, dati: e.tenuto ? { domanda: `Su quali tavole lo usiamo, «${e.nome}»?`, rovescio: 'Funziona perché è prudente: il prossimo ramo lo spingerei.' } : { battuta: 'Anche i rami secchi fanno legna.', proposta: undefined } })
  }
  // l'osservatorio: gli scienziati sfogliano la biblioteca degli universi (il simulatore di stateyour) e portano in piazza
  // scoperte, ipotesi messe alla prova e domande di metodo
  if (o.cosmo) {
    C.osservatorio ??= { campioni: 0, misure: [], scoperte: [], ipotesi: [], indirizzi: [], conteggi: {} }
    try {
      const { eventi, nuove } = campagna(C.osservatorio, o.cosmo, r, C.giorno, { campioni: 36 })
      verbale.push({ fase: 'osservatorio' as Cella, chi: 'astronoma', tipo: 'misura', testo: `Oggi abbiamo misurato ${nuove.length} mondi (in tutto ${C.osservatorio.campioni}).` })
      for (const e of eventi) osservazioni.push({ ...e, nomi: [], dati: e.dati as Evento['dati'] })
    } catch (e) { verbale.push({ fase: 'osservatorio' as Cella, chi: 'astronoma', tipo: 'guasto', testo: `Il telescopio si è inceppato: ${e instanceof Error ? e.message : e}` }) }
  }
  // 3. il guizzo: emergente dal carattere (visionario, poco prudente) e da quanto ha visto di nuovo; al massimo uno al giorno
  const guizzi = C.abitanti.map(a => [a, R.guizzo * (1 + a.carattere.visionario * 4) * (1 - a.carattere.prudente * 0.5) * (1 + a.visti.length / 400)] as const).filter(([, p]) => r() < p).sort((x, y) => y[1] - x[1])
  if (guizzi.length) {
    const a = guizzi[0][0]
    const due = [P[Math.floor(r() * tot)], P[Math.floor(r() * tot)]]
    const qa = quart(due[0].id)?.nome, qb = quart(due[1].id)?.nome
    const forti = T.quartieri.slice().sort((x, y) => y.n - x.n).slice(0, 6).flatMap(q => q.concetti.slice(0, 1))
    const nomeProposto = forti.length >= 2 ? `${forti[Math.floor(r() * forti.length)]}${uno(['ia', 'opoli', 'ana', ' Nuova', ' di Sopra'])}`.replace(/^./, c => c.toUpperCase()) : null
    const tutte = [
      { t: `E se costruissimo un ponte tra «${qa}» e «${qb}», due quartieri che non si parlano mai? Una tavola in mezzo, fatta con le mani di entrambi.`, n: `un ponte tra «${qa}» e «${qb}»`, p: `Un ponte tra «${qa}» e «${qb}».` },
      C.nome ? null : nomeProposto && { t: `Questa città non ha un nome. Io la chiamerei ${nomeProposto}.`, n: `chiamare la città ${nomeProposto}`, p: `Chiamare la città ${nomeProposto}.` },
      { t: `Facciamo crescere un albero vero in piazza: le radici nelle tavole più vecchie, i rami verso quelle di oggi.`, n: 'un albero in piazza', p: 'Un albero 3D in piazza, radici nelle tavole vecchie.' },
      { t: `Una tavola che sia la mappa di questa città, vista da sopra, con le nostre case.`, n: 'una tavola-mappa della città', p: 'Una tavola che disegna la città.' },
      { t: `Per un giorno lavoriamo al contrario: si parte dalla tavola più brutta del quartiere «${qa}» e la si porta a essere la migliore.`, n: `rifare la peggiore di «${qa}»`, p: `Riprendere la tavola più debole di «${qa}».` },
      { t: `E se le tavole scartate avessero un quartiere loro, una specie di discarica bella?`, n: 'un quartiere degli scarti', p: 'Un quartiere per gli scarti.' },
    ].filter(Boolean) as { t: string; n: string; p: string }[]
    const g = uno(tutte.filter(x => !C.rete.some(n => n.testo === x.t)))
    const azione = g?.n.startsWith('chiamare la città') && nomeProposto ? { tipo: 'nome', nome: nomeProposto } : { tipo: 'nota' }
    if (g) osservazioni.push({ tipo: 'guizzo', chi: a.id, testo: g.t, nucleo: g.n, argomento: 'guizzo:' + g.n, tema: vettoreDi(g.t), nomi: [], tavole: due.map(d => d.id), peso: 1.1, dati: { azione, proposta: g.p, obiezione: `Bello, ma prima sistemiamo quello che c'è.`, battuta: `Va bene, ma stavolta lo finiamo.` } })
  }

  // una cosa già detta nei giorni scorsi non si ridice uguale: si dice «ancora» e si guarda il piano aperto, oppure si tace
  for (const e of osservazioni) {
    const prima = C.rete.find(n => n.giorno < C.giorno && n.tipo === e.tipo && n.testo === e.testo)
    if (prima) { const piano = C.piani.find(p => p.stato !== 'chiuso' && cos(vettoreDi(p.cosa), e.tema) > 0.3); e.testo = piano ? `Ancora: ${e.nucleo ?? e.testo}. C'è già un piano («${piano.cosa.slice(0, 80)}»), ma è fermo.` : `Lo ripeto dal giorno ${prima.giorno}: ${e.nucleo ?? e.testo}.`; e.peso *= 0.6; (e as any).vecchia = true }
  }
  // in piazza: ognuno dice prima la sua se ce l'ha (chi l'ha notata), poi gli altri reagiscono secondo soglia
  for (const a of C.abitanti) a.cella = 'piazza'
  osservazioni.sort((x, y) => ((y as any).vecchia ? 0 : 1) - ((x as any).vecchia ? 0 : 1) + (r() - 0.5) * 0.8)
  let vecchie = 0
  for (const e of osservazioni.filter(x => !(x as any).vecchia || vecchie++ < 2).slice(0, 5)) {
    if (e.chi) { verbale.push({ fase: 'piazza', chi: e.chi, tipo: e.tipo, testo: e.testo }); nota(e.tipo, e.testo, e.chi, e.tavole, e.tema) }
    coda.push(e); discuti('piazza', C.abitanti.filter(a => a.cella === 'piazza'))
  }

  // 4. salti: chi ha un'urgenza (una domanda sua aperta) va direttamente in biblioteca o in bottega
  for (const a of C.abitanti) {
    const mie = C.domande.filter(d => d.chi === a.id && d.stato === 'aperta').length
    const urge = mie * (0.6 + a.carattere.prudente) + (a.carattere.trascinatore > 0.7 ? 0.8 : 0)
    if (urge > R.salto) { a.cella = mie ? 'biblioteca' : 'bottega'; verbale.push({ fase: 'piazza', chi: a.id, tipo: 'salto', testo: `Vado subito in ${a.cella}.` }) }
  }
  // 5. biblioteca: prima cosa è successo davvero (l'archivio), poi quello che sappiamo già (la rete), poi fuori
  const daCercare: Citta['domande'] = []
  for (const d of C.domande.filter(x => x.stato === 'aperta').slice(0, 6)) {
    if (d.stato !== 'aperta') continue
    const v = vettoreDi(d.testo)
    // prima: cosa è successo davvero, nell'archivio
    const arg = (d as any).argomento as string | undefined
    if (arg?.startsWith('frase:')) {
      const f = arg.slice(6), con = opere.filter(w => String(w.title ?? '').toLowerCase().includes(f))
      const gia = C.rete.find(n => n.tipo === 'risposta' && n.testo.startsWith(`«${f}»`) && n.giorno < C.giorno)
      if (gia) { d.stato = 'risposta'; d.risposta = gia.testo; verbale.push({ fase: 'biblioteca', chi: 'saggista', a: d.chi, tipo: 'risposta', testo: `Per ${di(d.chi)}: l'abbiamo già ricostruito il giorno ${gia.giorno} (${gia.testo.slice(0, 90)}).` }); continue }
      if (con.length) {
        const gemelle = C.domande.filter(x => x !== d && x.stato === 'aperta' && (x as any).argomento === arg); for (const x of gemelle) { x.stato = 'risposta'; x.risposta = 'vedi sopra' }
        const chiede = [d, ...gemelle].map(x => di(x.chi)).filter((x, i, a) => a.indexOf(x) === i)
        const primo = con[0], mani = new Map<string, number>()
        for (const w of con) for (const s of T.insiemi) if ((s.membri[w.id] ?? 0) > 0.3) mani.set(s.abitante.nome, (mani.get(s.abitante.nome) ?? 0) + 1)
        const chi = [...mani].sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => x[0])
        const parole = new Map<string, number>(); for (const w of con) if (w.intention?.word) parole.set(w.intention.word, (parole.get(w.intention.word) ?? 0) + 1)
        const temi = [...parole].sort((x, y) => y[1] - x[1]).slice(0, 3).map(x => x[0])
        d.stato = 'risposta'; d.risposta = `dal giorno ${primo.day}, ${con.length} tavole`
        verbale.push({ fase: 'biblioteca', chi: 'saggista', a: d.chi, tipo: 'risposta', testo: `Per ${chiede.join(' e ')}: «${f}» compare la prima volta il giorno ${primo.day} («${primo.title}»), poi in ${con.length} tavole. Torna soprattutto con ${temi.join(', ')}${chi.length ? `, e passa di più dalle mani ${chi.map(del_).join(' e ')}` : ''}.` })
        nota('risposta', `«${f}»: dal giorno ${primo.day}, ${con.length} tavole, con ${temi.join(', ')}`, 'saggista', con.map(w => w.id))
        continue
      }
    }
    const dalla = C.rete.filter(n => n.tipo !== 'battuta' && n.tipo !== 'cammino' && n.giorno < C.giorno).map(n => [n, cos(v, n.vettore)] as const).sort((x, y) => y[1] - x[1])[0]
    if (dalla && dalla[1] > 0.35) { d.stato = 'risposta'; d.risposta = dalla[0].testo; verbale.push({ fase: 'biblioteca', chi: 'saggista', a: d.chi, tipo: 'risposta', testo: `Per ${di(d.chi)}: ne sappiamo già qualcosa, dal giorno ${dalla[0].giorno}: «${dalla[0].testo.slice(0, 140)}».` }); continue }
    daCercare.push(d)
  }
  // fuori: la saggista porta le domande aperte nelle sue fonti; ognuno legge per conto suo nelle proprie
  const trovate: Evento[] = []
  let budget = o.ricerche ?? 8
  const scegliFonte = (a: Abitante) => { const e = Object.entries(a.fonti ?? { 'wiki-it': 1 }).filter(([, w]) => w > 0.05); if (r() < 0.12 * (1 + a.carattere.visionario)) { const nuove = CATALOGO.filter(x => !(a.fonti ?? {})[x]); if (nuove.length) return nuove[Math.floor(r() * nuove.length)] } let x = r() * e.reduce((t, [, w]) => t + w, 0); for (const [k, w] of e) if ((x -= w) <= 0) return k; return e[0][0] }
  const VIA = new Set('cominciato cominciare stanno porta ridire quando quanto succede nello nella perché cosa sanno fanno fare nessun nessuno altro altri sempre finiamo davvero parla nostre nostri prima'.split(' '))
  const chiave = (d: { testo: string; cerca?: string }) => { if (d.cerca) return d.cerca; const q = d.testo.match(/«([^»]+)»/)?.[1]; const w = (q ?? d.testo).toLowerCase().split(/[^a-zàèéìòù]+/).filter(x => x.length >= 4 && !VIA.has(x) && radice(x)); return w.slice(0, 3).join(' ') }
  const migliore = (l: Lettura[], v: Record<string, number>, q = '') => {
    let best: { l: Lettura; frase: string; s: number } | null = null
    const radici = q.toLowerCase().split(/\s+/).filter(w => w.length >= 4).map(w => w.slice(0, Math.max(4, w.length - 2)))
    for (const x of l) for (const f of String(x.text ?? '').split(/(?<=[.!?])\s+/).slice(0, 400)) {
      if (f.length < 40 || f.length > 260 || /[`=≥≤∑]/.test(f)) continue
      if (radici.length && !radici.some(rr => `${x.title} ${f}`.toLowerCase().includes(rr))) continue
      const s = cos(v, vettoreDi(f)) + cos(v, vettoreDi(x.title ?? '')) * 0.3
      if (!best || s > best.s) best = { l: x, frase: f, s }
    }
    return best
  }
  const impara = (a: Abitante, fonte: string, s: number | null) => { a.fonti ??= {}; a.fonti[fonte] = Math.max(0.05, Math.min(2, (a.fonti[fonte] ?? 0.3) + (s === null ? -0.15 : s > 0.15 ? 0.25 : -0.05))) }
  const breve = (f: string) => { const w = f.split(/\s+/); return w.length > 22 ? w.slice(0, 22).join(' ') + '…' : f }
  if (o.cerca) {
    const sag = ab('saggista')
    for (const d of daCercare.slice(0, 4)) {
      if (budget-- <= 0) break
      const q = chiave(d as any); if (!q) continue
      const fonte = scegliFonte(sag)
      const l = await o.cerca(fonte, q, 2).catch(() => [] as Lettura[])
      const m = l.length ? migliore(l, vettoreDi(d.testo + ' ' + q), q) : null
      impara(sag, fonte, m ? m.s : null)
      if (m && m.s > 0.1) {
        d.stato = 'risposta'; d.risposta = `${m.l.title} (${m.l.source})`; (d as any).fiducia = +Math.min(1, m.s * 2).toFixed(2)
        verbale.push({ fase: 'biblioteca', chi: 'saggista', a: d.chi, tipo: 'risposta', testo: `Per ${di(d.chi)}: ho cercato «${q}» in ${m.l.source} e ho trovato «${m.l.title}». Ci dice: ${breve(m.frase)}` })
        nota('risposta', `${q}: ${m.l.title} (${m.l.source}) — ${m.frase}`, 'saggista', undefined)
        trovate.push({ tipo: 'lettura', chi: 'saggista', testo: `Sulla domanda ${del_(di(d.chi))} ho trovato «${m.l.title}» (${m.l.source}).`, nucleo: `quello che dice «${m.l.title}»`, argomento: 'lettura:' + m.l.title, tema: vettoreDi(`${q} ${m.frase}`), nomi: d.chi ? [d.chi] : [], peso: 1, dati: { domanda: `Ma «${m.l.title}» parla davvero di noi?`, proposta: `Una tavola che parta da «${m.l.title}».` } })
      } else verbale.push({ fase: 'biblioteca', chi: 'saggista', a: d.chi, tipo: 'cerca', testo: `Ho cercato «${q}» in ${fonte.replace('rivista:', '')}: niente di utile. Ci riprovo altrove.` })
    }
    // le letture personali: chi è in biblioteca (o ci va dopo la piazza) legge qualcosa sul suo
    const lettori = C.abitanti.filter(a => a.id !== 'saggista').sort(() => r() - 0.5)
    for (const a of lettori) {
      if (budget-- <= 0) break
      const temi = Object.entries(a.interessi).filter(([k]) => !k.startsWith('m:')).sort((x, y) => y[1] - x[1]).map(e => e[0])
      const strumenti = Object.keys(a.interessi).filter(k => k.startsWith('m:')).map(k => k.slice(2))
      const forma = (k: string) => { for (const w of opere.slice(-400)) { const p = w.intention?.word; if (p && radice(p) === k) return p } return null }
      const q = a.tipo === 'mestiere' ? strumenti[Math.floor(r() * strumenti.length)] : forma((r() < 0.6 ? temi[0] : temi[Math.floor(r() * Math.min(3, temi.length))]) ?? '')
      if (!q) continue
      const fonte = scegliFonte(a)
      const l = await o.cerca(fonte, q, 2).catch(() => [] as Lettura[])
      const v = { ...a.interessi, ...vettoreDi(q) }
      const m = l.length ? migliore(l, v, q) : null
      impara(a, fonte, m ? m.s : null)
      if (!m || m.s < 0.1) continue
      verbale.push({ fase: 'biblioteca', chi: a.id, tipo: 'legge', testo: `Ho letto «${m.l.title}» (${m.l.source}), cercando «${q}».` })
      nota('lettura', `${a.nome} su «${q}»: ${m.l.title} (${m.l.source}) — ${m.frase}`, a.id, undefined, { ...vettoreDi(`${q} ${m.frase}`) })
      trovate.push({ tipo: 'lettura', chi: a.id, testo: `Su «${q}» ho trovato questo, in ${m.l.source}: ${breve(m.frase)}`, nucleo: `quello che ${a.nome} ha letto su ${q}`, argomento: 'lettura:' + a.id + q, tema: vettoreDi(`${q} ${m.frase}`), nomi: [], peso: 0.9, dati: { proposta: a.tipo === 'mestiere' ? `Provare ${q} come dice ${m.l.source}: una tavola di prova in bottega.` : `Una tavola su «${q}» che parta da questa lettura.`, domanda: `Cosa c'entra con le nostre tavole su «${q}»?` } })
    }
  } else for (const d of daCercare) verbale.push({ fase: 'biblioteca', chi: 'saggista', a: d.chi, tipo: 'cerca', testo: `Su «${d.testo}» per ora niente: fuori non posso uscire.` })
  // ritorno in piazza: ognuno porta quello che ha letto, e se ne parla secondo soglia
  for (const a of C.abitanti) a.cella = 'ritorno'
  for (const e of trovate.sort(() => r() - 0.5).slice(0, 5)) {
    verbale.push({ fase: 'ritorno', chi: e.chi!, tipo: 'porta', testo: e.testo }); nota('porta', e.testo, e.chi, undefined, e.tema)
    coda.push(e); discuti('ritorno', C.abitanti)
  }
  // 5b. bottega: si guardano le prove fatte dallo studio su commissione, poi qualcuno chiede la prossima
  for (const a of C.abitanti) a.cella = 'bottega'
  C.bottega ??= []; C.mostre ??= []; C.mancanti ??= []
  const perId = new Map(opere.map(w => [w.id, w]))
  const media = opere.slice(-200).reduce((t, w) => t + (w.interest ?? 0.5), 0) / Math.max(1, Math.min(200, opere.length))
  for (const c of C.bottega.filter(x => x.stato === 'fatta' && !x.esito)) {
    const fatte = (c.fatte ?? []).map(id => perId.get(id)).filter(Boolean) as Opera[]
    if (!fatte.length) continue
    const best = fatte.slice().sort((x, y) => (y.interest ?? 0) - (x.interest ?? 0))[0]
    const i = best.interest ?? 0.5, buona = i >= media
    c.esito = `${Math.round(i * 100)}% (media ${Math.round(media * 100)}%)`
    const autore = ab(c.autore)
    if (autore) { C.credito ??= {}; (C.credito[c.autore] ??= {}).mani = Math.max(0.3, Math.min(3, ((C.credito[c.autore] ?? {}).mani ?? 1) + (buona ? 0.2 : -0.1))) }
    const ev: Evento = { tipo: 'prova', chi: c.autore, testo: buona ? `La tavola che avevo chiesto su «${c.parola}» è venuta: «${best.title}», ${c.esito}.` : `La mia prova su «${c.parola}» non regge: «${best.title}», ${c.esito}. Ci ho imparato qualcosa.`, nucleo: `la prova ${del_(di(c.autore))} su «${c.parola}»`, argomento: 'prova:' + c.id, tema: vettoreDi(`${c.parola} ${best.title}`), nomi: c.con ? [c.con] : [], tavole: fatte.map(w => w.id), peso: 1, dati: buona ? { domanda: `Cosa la fa funzionare, e cosa è venuto per caso?`, rovescio: 'Piace, ma è la strada più facile: la prossima va spinta più in là.', battuta: 'Finalmente qualcosa di nostro.' } : { domanda: `Cosa non ha funzionato nella prova su «${c.parola}»?`, rovescio: 'Una prova che non regge dice più di una che piace.' } }
    verbale.push({ fase: 'bottega', chi: c.autore, tipo: 'prova', testo: ev.testo }); nota('prova', ev.testo, c.autore, ev.tavole, ev.tema)
    coda.push(ev); discuti('bottega', C.abitanti)
  }
  for (const c of C.bottega) if (c.stato === 'in attesa' && c.giorno < C.giorno - 6) c.stato = 'scaduta'
  // le commissioni nuove: chi ha più voglia (tensioni accumulate, letture portate, carattere) chiede una tavola; al massimo una in attesa per volta
  C.cantieri ??= []
  const cantiereScopo = () => { for (const c of C.cantieri!) { const p = c.passi.find(x => x.dove === 'officina' && x.stato === 'da fare'); if (p) { p.stato = 'fatto'; return p.testo.match(/«([^»]+)»/)?.[1] ?? null } } return null }
  const noti = new Set(o.strumenti ?? [])
  const strumentiDi = (a: Abitante) => Object.keys(a.interessi).filter(k => k.startsWith('m:')).map(k => k.slice(2)).filter(t => !noti.size || noti.has(t))
  const formaDi = (k: string) => { for (let i = opere.length - 1; i >= Math.max(0, opere.length - 600); i--) { const p = opere[i].intention?.word; if (p && radice(p) === k) return p } return null }
  if (!C.bottega.some(c => c.stato === 'in attesa')) {
    // prima i mancanti che si possono già fare con quello che c'è (un ponte, una mappa, un albero in piazza)
    const fattibile = C.mancanti.find(m => /ponte|mappa|disegna la città|albero/i.test(m.cosa) && !C.bottega!.some(c => c.perche === m.cosa))
    const recenti = (a: Abitante) => C.bottega!.filter(c => c.autore === a.id && c.giorno >= C.giorno - 6).length
    const voglia = (a: Abitante) => a.tensione + Math.min(3, a.storia.filter(x => x.startsWith(`${C.giorno}:`)).length) * 0.3 + a.carattere.trascinatore * 0.5 + r() * 0.8 - recenti(a) * 1.2
    const chi = C.abitanti.filter(a => a.tipo !== 'figura' || fattibile).sort((x, y) => voglia(y) - voglia(x))[0]
    if (chi) {
      // un compagno: il mestiere o la testa con cui va più d'accordo (le mani per una testa, una parola per un mestiere)
      const compagni = C.abitanti.filter(x => x !== chi && (chi.tipo === 'testa' ? x.tipo === 'mestiere' : chi.tipo === 'mestiere' ? x.tipo === 'testa' : x.tipo !== 'figura'))
      const con = compagni.sort((x, y) => (chi.peso[y.id] ?? 0) - (chi.peso[x.id] ?? 0) + (r() - 0.5) * 0.6)[0]
      const lettaOggi = C.rete.filter(n => n.giorno === C.giorno && n.tipo === 'lettura' && n.chi === chi.id)[0]
      const temaPrimo = (a: Abitante) => Object.entries(a.interessi).filter(([k]) => !k.startsWith('m:')).sort((x, y) => y[1] - x[1]).map(e => e[0]).find(k => formaDi(k))
      let parola = '', perche = ''
      if (fattibile && /ponte/i.test(fattibile.cosa)) { const q = fattibile.cosa.match(/«([^»]+)»/g)?.map(x => x.slice(1, -1).split(' e ')[0]) ?? []; parola = q[0] ?? 'ponte'; perche = fattibile.cosa }
      else if (fattibile) { parola = /albero/i.test(fattibile.cosa) ? 'albero' : 'città'; perche = fattibile.cosa }
      else if (lettaOggi) { parola = lettaOggi.testo.match(/su «([^»]+)»/)?.[1] ?? ''; perche = `dopo quello che ho letto oggi` }
      if (!parola) { const k = temaPrimo(chi.tipo === 'testa' ? chi : con ?? chi); parola = k ? formaDi(k)! : ''; perche = chi.tipo === 'mestiere' ? 'voglio vedere cosa sanno fare le mie mani da sole su un tema vero' : 'voglio vedere questa parola con mani che non uso mai' }
      let sts = [...new Set([...strumentiDi(chi), ...(con ? strumentiDi(con) : [])])]
      if (chi.tipo === 'scienziato') { const sc = C.osservatorio?.scoperte.at(-1); sts = ['universo', 'cristallo', 'acqua', 'luce', 'grana'].filter(t => !noti.size || noti.has(t)); if (sc) { parola = /acqua/.test(sc.testo) ? 'acqua' : 'pianeta'; perche = `dal mondo ${sc.n} della biblioteca: ${sc.testo}` } }
      if (parola && sts.length) {
        const c: Commissione = { id: `c${C.giorno}.${C.bottega.length}`, giorno: C.giorno, autore: chi.id, nome: chi.nome, con: con?.nome, parola, strumenti: sts.slice(0, 6), perche, stato: 'in attesa' }
        C.bottega.push(c)
        verbale.push({ fase: 'bottega', chi: chi.id, tipo: 'commissione', testo: `Chiedo una tavola su «${parola}»${con ? `, insieme ${a_(con.nome)}` : ''}, con ${sts.slice(0, 3).join(', ')}: ${perche}.` })
        nota('commissione', `${chi.nome}: una tavola su «${parola}» con ${sts.slice(0, 3).join(', ')}`, chi.id)
      }
    }
  }
  // l'officina: chi ha voglia di costruirsi un attrezzo scrive (o ramifica) un generatore. Chi ha un programma tenuto
  // tende a farne un ramo; un visionario prova da zero o un innesto. Al massimo una richiesta per giornata.
  C.officina ??= { richieste: [], esiti: [], tenuti: [] }
  const artigiani = C.abitanti.filter(a => a.tipo === 'mestiere' && strumentiDi(a).length)
  const stati = (C.officina as { storia?: { chi: string; giorno: number; scopo: string }[] }).storia ??= []
  const daPoco = (a: Abitante) => stati.filter(x => x.chi === a.id && x.giorno >= C.giorno - 8).length
  const inventore = artigiani.sort((x, y) => (y.carattere.visionario + y.tensione * 0.3 + r() * 0.8 - daPoco(y) * 0.9) - (x.carattere.visionario + x.tensione * 0.3 + r() * 0.8 - daPoco(x) * 0.9))[0]
  const ultimaOfficina = stati.at(-1)?.giorno ?? -99
  if (inventore && C.giorno - ultimaOfficina >= 2 && r() < 0.3 + inventore.carattere.visionario * 0.5) {
    const miei = C.officina.tenuti.filter(t => t.autore === inventore.id)
    const tutti = C.officina.tenuti
    const modo: RichiestaOfficina['modo'] = miei.length && r() < 0.55 ? 'ramo' : tutti.length >= 2 && r() < 0.25 + inventore.carattere.visionario * 0.3 ? 'innesto' : 'zero'
    const base = modo === 'ramo' ? miei[Math.floor(r() * miei.length)] : modo === 'innesto' ? tutti[Math.floor(r() * tutti.length)] : undefined
    const altrui = C.abitanti.filter(a => a.tipo === 'mestiere' && a !== inventore && (inventore.peso[a.id] ?? 0) >= 0)
    const prestito = altrui.length && r() < 0.5 ? strumentiDi(altrui[Math.floor(r() * altrui.length)]) : []
    // lo scopo: un cantiere che aspetta un attrezzo, oppure una parola di oggi (una commissione, una lettura), oppure una delle sue
    const usati = new Set(stati.filter(x => x.chi === inventore.id).map(x => x.scopo))
    const oggiParole = [...C.bottega.filter(c => c.giorno === C.giorno).map(c => c.parola), ...C.rete.filter(n => n.giorno === C.giorno && n.tipo === 'lettura').map(n => n.testo.match(/su «([^»]+)»/)?.[1]).filter(Boolean) as string[]]
    const sue = Object.entries(inventore.interessi).filter(([k]) => !k.startsWith('m:')).map(([k]) => formaDi(k)).filter(Boolean) as string[]
    const candidati = [...oggiParole, ...sue].filter(w => !usati.has(w))
    const scopo = cantiereScopo() ?? candidati[Math.floor(r() * Math.min(candidati.length, 5))] ?? sue[Math.floor(r() * sue.length)] ?? 'forma'
    stati.push({ chi: inventore.id, giorno: C.giorno, scopo }); if (stati.length > 60) stati.splice(0, stati.length - 60)
    C.officina.richieste.push({ autore: inventore.nome, scopo, strumenti: [...new Set([...strumentiDi(inventore), ...prestito.slice(0, 2)])], modo, base: base?.id, giorno: C.giorno })
    verbale.push({ fase: 'bottega', chi: inventore.id, tipo: 'officina', testo: modo === 'ramo' ? `Vado in officina a fare un ramo di «${base!.nome}».` : modo === 'innesto' ? `Vado in officina: provo a innestare «${base!.nome}» con un altro programma.` : `Vado in officina a scrivere un generatore nuovo per «${scopo}», con ${[...new Set([...strumentiDi(inventore), ...prestito.slice(0, 2)])].slice(0, 4).join(', ')}.` })
  }

  // il curatore: ogni tanto mette in mostra le prove migliori della città (con il perché), così il sito ne ha una sala
  const provate = C.bottega.filter(c => c.esito && c.fatte?.length).slice(-12)
  if (provate.length >= 3 && C.giorno - (C.mostre.at(-1)?.giorno ?? -99) >= 5) {
    const scelte = provate.flatMap(c => (c.fatte ?? []).map(id => ({ w: perId.get(id), c }))).filter(x => x.w && (x.w.interest ?? 0) >= media).sort((x, y) => (y.w!.interest ?? 0) - (x.w!.interest ?? 0)).slice(0, 5)
    if (scelte.length >= 2) {
      const m: Mostra = { giorno: C.giorno, curatore: 'curatore', opere: scelte.map(x => ({ id: x.w!.id, titolo: x.w!.title ?? '', autore: x.c.nome, perche: `${x.c.nome}${x.c.con ? ` con ${x.c.con}` : ''}, su «${x.c.parola}»` })) }
      C.mostre.push(m); C.mostre = C.mostre.slice(-30)
      verbale.push({ fase: 'bottega', chi: 'curatore', tipo: 'mostra', testo: `Apro una sala nuova con ${scelte.length} tavole della bottega: ${scelte.map(x => `«${x.w!.title}» (${x.c.nome})`).join(', ')}.` })
    }
  }

  // 6. assemblea: richiama tutti, ovunque siano. Prima si guarda come vanno le decisioni in vigore, poi si vota.
  for (const a of C.abitanti) a.cella = 'assemblea'
  const oggiA = o.giornoAgente ?? Math.max(...opere.map(w => w.day))
  C.decisioni ??= []; C.credito ??= {}
  const credito = (id: string, tema: string) => C.credito![id]?.[tema] ?? 1
  const accredita = (id: string, tema: string, d: number) => { (C.credito![id] ??= {})[tema] = Math.max(0.3, Math.min(3, credito(id, tema) + d)) }
  const temaDi = (az?: Azione) => az?.tipo === 'sospendi' ? 'parole' : az?.tipo === 'solo' ? 'mani' : az?.tipo === 'nome' ? 'città' : 'idee'
  // verifica: le decisioni producono quello che promettevano?
  for (const d of C.decisioni.filter(x => x.stato === 'in vigore')) {
    if (d.tipo === 'sospendi') {
      const f = String(d.param.frase), dopo = opere.filter(w => w.day > d.giornoAgente && String(w.title ?? '').toLowerCase().includes(f)).length
      const nuove = opere.filter(w => w.day > d.giornoAgente).length
      if (nuove >= 6 && !d.esito) { d.esito = dopo === 0 ? 'funziona' : 'non basta'; verbale.push({ fase: 'assemblea', chi: 'archivio', tipo: 'verifica', testo: dopo === 0 ? `Da quando abbiamo sospeso «${f}» sono uscite ${nuove} tavole e non è più tornata.` : `Abbiamo sospeso «${f}» ma è tornata ${dopo} volte in ${nuove} tavole: da qualche altra parte nasce ancora.` }); for (const x of d.favorevoli) accredita(x, 'parole', dopo === 0 ? 0.15 : -0.1); accredita(d.chi, 'parole', dopo === 0 ? 0.3 : -0.2) }
    }
    if (d.tipo === 'solo') {
      const sts = (d.param.strumenti as string[]), con = opere.filter(w => w.day > d.giornoAgente && (w.gestures ?? []).some(g => g.kept !== false && sts.some(t => g.tool.includes(t))))
      const tutte = opere.filter(w => w.day > d.giornoAgente)
      if (tutte.length >= 6 && !d.esito) { const m = (l: Opera[]) => l.reduce((t, w) => t + (w.interest ?? 0.5), 0) / (l.length || 1); const pm = m(con), pt = m(opere.filter(w => w.day <= d.giornoAgente).slice(-200)); d.esito = `${con.length} tavole con quelle mani, interesse ${Math.round(pm * 100)}% contro ${Math.round(pt * 100)}% di prima`; verbale.push({ fase: 'assemblea', chi: String(d.param.mestiere), tipo: 'verifica', testo: con.length ? `Mi avete fatto cominciare io: ${d.esito}.` : `Avevamo deciso che cominciassi io, ma in ${tutte.length} tavole non mi ha chiamato nessuno.` }); accredita(d.chi, 'mani', con.length && pm >= pt ? 0.3 : -0.15) }
    }
    if (d.fino < oggiA) { d.stato = 'scaduta'; verbale.push({ fase: 'assemblea', chi: 'urbanista', tipo: 'scade', testo: `Scade la decisione «${d.cosa.slice(0, 90)}»${d.esito ? ` (${d.esito})` : ''}. Si può riproporre.` }) }
  }
  // il voto: chi ha preso posizione oggi vota così; gli altri secondo carattere e fiducia in chi propone. Ogni voto pesa il credito sul tema.
  const odg = C.piani.filter(p => p.stato === 'proposto' && p.giorno >= C.giorno - 3).slice(-4)
  for (const p of odg) {
    const tema = temaDi(p.azione), pos = p.argomento ? posizioni.get(p.argomento) : undefined
    let pro = 0, contro = 0; const fav: string[] = []
    for (const a of C.abitanti) {
      let v = pos?.get(a.id)
      if (v === undefined) {
        if (a.id === p.chi) v = 1
        else { const c = a.carattere, x = (a.peso[p.chi] ?? 0) * 0.8 + (c.credulone - c.testardo) * 0.6 + (p.azione?.tipo === 'nota' || p.azione?.tipo === 'nome' ? (c.visionario - c.prudente) * 0.8 : 0) + (r() - 0.5) * 0.6; v = x > 0.15 ? 1 : x < -0.15 ? -1 : 0 }
      }
      const w = credito(a.id, tema)
      if (v > 0) { pro += w; fav.push(a.id) } else if (v < 0) contro += w
    }
    p.voti = { pro: +pro.toFixed(1), contro: +contro.toFixed(1) }
    const passa = pro > contro * 1.2 && fav.length >= 3
    const gia = C.decisioni.some(d => d.stato === 'in vigore' && JSON.stringify(d.param) === JSON.stringify(p.azione))
    if (passa && !gia && p.azione && p.azione.tipo !== 'nota') {
      p.stato = 'approvato'
      const { tipo, ...param } = p.azione as Azione & Record<string, unknown>
      const d: Decisione = { id: `d${C.giorno}.${C.decisioni.length}`, giorno: C.giorno, giornoAgente: oggiA, chi: p.chi, cosa: p.cosa, tipo, param, fino: oggiA + (o.durata ?? 40), stato: 'in vigore', favorevoli: fav }
      if (tipo === 'nome') { const vecchio = C.nome; C.nome = String(param.nome); verbale.push({ fase: 'assemblea', chi: p.chi, tipo: 'nome', testo: vecchio ? `La città non si chiama più ${vecchio}: da oggi è ${C.nome}.` : `Da oggi la città si chiama ${C.nome}.` }) }
      C.decisioni.push(d)
      verbale.push({ fase: 'assemblea', chi: 'urbanista', tipo: 'approvato', testo: `Approvato (${p.voti.pro} a ${p.voti.contro}): ${p.cosa}${tipo === 'nome' ? '' : ` Vale fino al giorno ${d.fino}, poi si vede com'è andata.`}` })
      nota('decisione', p.cosa, p.chi)
    } else if (passa && p.azione?.tipo === 'nota') {
      // come facciamo? chi l'ha proposta scompone il problema: cosa serve, dove si fa, cosa manca
      const cosa = p.cosa.toLowerCase(), passi: Cantiere['passi'] = []
      const parola = p.cosa.match(/«([^»]+)»/)?.[1]?.split(' e ')[0]
      if (/ponte/.test(cosa)) { const due = (p.cosa.match(/«([^»]+)»/g) ?? []).map(x => x.slice(1, -1)); if (due.length >= 2) C.domande.push({ giorno: C.giorno, chi: p.chi, testo: `Cosa hanno in comune «${due[0]}» e «${due[1]}»?`, stato: 'aperta', cerca: `${due[0].split(' e ')[0]} ${due[1].split(' e ')[0]}` } as any) }
      if (/ponte/.test(cosa)) passi.push({ testo: `trovare cosa hanno in comune i due quartieri`, dove: 'biblioteca', stato: 'fatto' }, { testo: `un generatore che tenga insieme le due mani, per «${parola ?? 'ponte'}»`, dove: 'officina', stato: 'da fare' }, { testo: 'la tavola-ponte', dove: 'bottega', stato: 'da fare' })
      else if (/albero/.test(cosa)) passi.push({ testo: 'il simulatore dell\'albero (c\'è)', dove: 'bottega', stato: 'da fare' }, { testo: 'piantarlo nello spazio 3D del sito', dove: 'sito', stato: 'aspetta' })
      else if (/mappa|disegna la città/.test(cosa)) passi.push({ testo: 'un generatore che disegni piante di città, per «città»', dove: 'officina', stato: 'da fare' }, { testo: 'la tavola-mappa dal territorio', dove: 'bottega', stato: 'da fare' })
      else if (/scart/.test(cosa)) passi.push({ testo: 'un quartiere per gli scarti nel sito', dove: 'sito', stato: 'aspetta' })
      else if (/debole|peggiore/.test(cosa)) passi.push({ testo: `riprendere la tavola più debole${parola ? ` di «${parola}»` : ''}`, dove: 'bottega', stato: 'da fare' })
      else passi.push({ testo: p.cosa, dove: 'bottega', stato: 'da fare' })
      C.cantieri!.push({ id: `k${C.giorno}.${C.cantieri!.length}`, giorno: C.giorno, chi: p.chi, cosa: p.cosa, passi })
      p.stato = 'in lista'; C.mancanti!.push({ giorno: C.giorno, chi: p.chi, cosa: p.cosa })
      verbale.push({ fase: 'assemblea', chi: p.chi, tipo: 'come', testo: `Come facciamo? ${passi.map((x, i) => `${i + 1}) ${x.testo} (${x.dove}${x.stato === 'aspetta' ? ', ancora non possiamo' : ''})`).join(' ')}` })
      verbale.push({ fase: 'assemblea', chi: 'urbanista', tipo: 'lista', testo: `Piace (${p.voti.pro} a ${p.voti.contro}): «${p.cosa}» diventa un cantiere.` }) }
    else if (!passa && pro + contro > 0) { if (p.giorno < C.giorno - 1) p.stato = 'respinto'; verbale.push({ fase: 'assemblea', chi: 'urbanista', tipo: 'respinto', testo: `Non passa (${p.voti.pro} a ${p.voti.contro}): ${p.cosa}` }) }
  }
  const oggi = odg
  // 7. archivio: tutto resta nella rete
  for (const a of C.abitanti) a.cella = 'casa'
  nota('giornata', `Giorno ${C.giorno} della città: ${verbale.length} battute, ${oggi.length} proposte, ${C.domande.filter(d => d.giorno === C.giorno).length} domande.`)
  return verbale
}

export { territorio }

/** la città si porta dietro solo quello che le serve: la rete resta lunga ma leggera */
export function compatta(C: Citta, max = 1500) {
  C.rete = C.rete.slice(-max).map(n => ({ ...n, vettore: Object.fromEntries(Object.entries(n.vettore).sort((a, b) => b[1] - a[1]).slice(0, 12)) }))
  C.domande = C.domande.slice(-200); C.piani = C.piani.slice(-200)
  for (const a of C.abitanti) { a.storia = a.storia.slice(-60); a.visti = a.visti.slice(-200) }
  return C
}

/** gli esiti dell'officina (girata nel browser dopo la giornata) entrano nella città: domani se ne parla */
export function riportaOfficina(C: Citta, esiti: { richiesta: { autore: string; scopo: string; giorno: number }; programma: { id: string; nome: string; punteggio?: number }; testo: string; tenuto: boolean; perche: string }[]) {
  C.officina ??= { richieste: [], esiti: [], tenuti: [] }
  for (const e of esiti) {
    C.officina.esiti.push({ autore: e.richiesta.autore, nome: e.programma.nome, testo: e.testo, tenuto: e.tenuto, perche: e.perche, scopo: e.richiesta.scopo, giorno: e.richiesta.giorno })
    if (e.tenuto) C.officina.tenuti.push({ id: e.programma.id, nome: e.programma.nome, autore: C.abitanti.find(a => a.nome === e.richiesta.autore)?.id ?? e.richiesta.autore, punteggio: e.programma.punteggio ?? 0 })
  }
  C.officina.richieste = []
  C.officina.esiti = C.officina.esiti.slice(-40)
}
