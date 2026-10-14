/**
 * Memoria del motore: quante volte ogni sistema (e ogni ossatura) è già stato
 * mostrato. Serve alla curiosità: tra tavole che il critico promuove, il
 * motore preferisce quelle che non ha ancora fatto vedere, e nel vivaio prova
 * prima i sistemi meno esplorati. Così la prima proposta cambia da un brief
 * all'altro e le impaginazioni nuove trovano spazio, senza abbassare la soglia.
 *
 * Vive in memoria finché la pagina è aperta e, nel browser, si conserva tra
 * le sessioni (localStorage, se c'è). Non tocca la qualità: il voto resta il
 * criterio, la curiosità decide tra tavole vicine.
 */
const CHIAVE = 'designer:memoria:v1'

interface Stato { sistemi: Record<string, number>; firme: Record<string, number>; giri: number }

let stato: Stato | null = null

function carica(): Stato {
  if (stato) return stato
  stato = { sistemi: {}, firme: {}, giri: 0 }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CHIAVE) : null
    if (raw) { const j = JSON.parse(raw) as Partial<Stato>; stato = { sistemi: j.sistemi ?? {}, firme: j.firme ?? {}, giri: j.giri ?? 0 } }
  } catch { /* memoria solo per questa pagina */ }
  return stato
}
function salva() {
  try { if (typeof localStorage !== 'undefined' && stato) localStorage.setItem(CHIAVE, JSON.stringify(stato)) } catch { /* niente */ }
}

/** Volte che un sistema è stato mostrato (con l'oblio: i giri vecchi pesano meno). */
export const mostrato = (sistema: string) => carica().sistemi[sistema] ?? 0

/**
 * Bonus di curiosità in punti di voto: alto per un sistema mai mostrato, poi
 * scende con la radice delle volte. Un'ossatura mai vista aggiunge un poco.
 */
export function curiosita(sistema: string, firma?: string) {
  const s = carica()
  const volte = s.sistemi[sistema] ?? 0
  const f = firma ? s.firme[`${sistema}|${firma}`] ?? 0 : 0
  return 9 / Math.sqrt(1 + volte) + (f ? 0 : 2)
}

/**
 * Registra le proposte mostrate: la prima pesa per intero (è quella che si
 * vede), le altre poco. Ogni giro i conti vecchi sbiadiscono un po', così un
 * sistema torna in gioco dopo un po' di brief.
 */
export function ricorda(proposte: { sistema: string; firma?: string }[]) {
  const s = carica()
  s.giri++
  for (const k of Object.keys(s.sistemi)) s.sistemi[k] *= 0.97
  proposte.forEach((p, i) => {
    const peso = i === 0 ? 1 : 0.15
    s.sistemi[p.sistema] = (s.sistemi[p.sistema] ?? 0) + peso
    if (p.firma) s.firme[`${p.sistema}|${p.firma}`] = (s.firme[`${p.sistema}|${p.firma}`] ?? 0) + peso
  })
  // le firme sono tante: si tengono solo le più recenti
  const fk = Object.keys(s.firme)
  if (fk.length > 600) for (const k of fk.slice(0, fk.length - 600)) delete s.firme[k]
  salva()
}

/** Azzera la memoria (prove, banco di misura). */
export function dimentica() {
  stato = { sistemi: {}, firme: {}, giri: 0 }
  salva()
}
