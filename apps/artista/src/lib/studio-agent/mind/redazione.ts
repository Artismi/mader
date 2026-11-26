// La redazione: è la città che decide cosa dire fuori (post e reel), non un pezzo a parte. Alla fine della giornata gli
// abitanti guardano il verbale: l'argomento è quello di cui si è parlato di più oggi; il discorso è un percorso nella città,
// dal territorio dove quell'argomento abita ai territori legati (per strade e ponti), ognuno con la voce di chi c'era e le
// tavole che il suo curatore ha appeso al centro. La sequenza (e quindi il carosello e il reel) prende la forma di questo
// percorso: una tappa per territorio, un passaggio per ogni strada, la decisione dell'assemblea in fondo. Puro: niente DOM.
import type { Territorio } from './territorio'

export type Tappa = { q: number; nome: string; parola: string; curatore?: string; voce?: { chi: string; nome: string; testo: string }; tavole: string[]; via?: string; colori?: string[] }
export type Palinsesto = { giorno: number; argomento: string; perche: string; narratore: { id: string; nome: string }; tappe: Tappa[]; decisione?: string; usato?: boolean }
type Battuta = { fase: string; chi: string; testo: string }
type Ab = { id: string; nome: string }

export function redigi(C: { giorno: number; abitanti: Ab[]; sale?: Record<string, { curatore?: string; suolo?: { colori?: string[] } }>; costruito?: { costruzioni: { tipo: string; a?: string; b?: string; q?: number; stato?: string }[]; nomiVie?: Record<string, string>; allestimenti?: Record<string, { voci: { id: string }[] }> }; decisioni?: { testo?: string; giorno?: number }[] }, T: Territorio, verbale: Battuta[], r: () => number): Palinsesto | null {
  if (!verbale.length || !T.quartieri.length) return null
  const nomeDi = (id: string) => C.abitanti.find(a => a.id === id)?.nome ?? id
  // l'argomento: la parola dei territori che oggi è tornata più volte nel verbale (chi la dice conta: più voci, più peso)
  const conta = new Map<string, { n: number; chi: Set<string>; q: number }>()
  for (const q of T.quartieri) for (const w of q.concetti) { const rad = w.toLowerCase().slice(0, Math.max(4, w.length - 2)); for (const b of verbale) if (b.testo.toLowerCase().includes(rad)) { const e = conta.get(w) ?? { n: 0, chi: new Set(), q: q.id }; e.n++; e.chi.add(b.chi); conta.set(w, e) } }
  const lista = [...conta.entries()].map(([w, e]) => [w, e.n + e.chi.size * 2, e.q] as const).sort((a, b) => b[1] - a[1])
  const [argomento, , q0] = lista[0] ?? [T.quartieri[0].concetti[0] ?? 'città', 0, T.quartieri[0].id]
  // il percorso: dal territorio dell'argomento ai più legati (ponti e strade prima, poi i fili), 3 o 4 tappe senza tornare indietro
  const legame = (a: number, b: number) => { let w = 0; for (const f of T.fili) { const qa = T.punti[f[0]]?.q, qb = T.punti[f[1]]?.q; if ((qa === a && qb === b) || (qa === b && qb === a)) w += f[2] } const ponte = (C.costruito?.costruzioni ?? []).some(c => c.tipo === 'ponte' && ((c.a === String(a) && c.b === String(b)) || (c.a === String(b) && c.b === String(a)))); return w + (ponte ? 5 : 0) }
  const percorso = [q0]
  while (percorso.length < 3 + (r() < 0.5 ? 1 : 0)) { const ult = percorso[percorso.length - 1], cand = T.quartieri.filter(q => !percorso.includes(q.id)).map(q => [q.id, legame(ult, q.id)] as const).sort((a, b) => b[1] - a[1]); if (!cand.length || cand[0][1] <= 0) break; percorso.push(cand[0][0]) }
  const capsula = (q: number) => (C.costruito?.costruzioni ?? []).find(c => c.tipo === 'capsula' && c.q === q && c.stato !== 'rovina') as { id?: string } | undefined
  const tappe: Tappa[] = percorso.map((q, i) => {
    const Q = T.quartieri.find(x => x.id === q)!, sala = C.sale?.[String(q)], cur = sala?.curatore
    // la voce: chi cura quel territorio, se oggi ha detto qualcosa; se no chi ha nominato una sua parola
    const parole = Q.concetti.map(w => w.toLowerCase().slice(0, Math.max(4, w.length - 2)))
    const b = verbale.find(v => v.chi === cur && v.testo.length > 20) ?? verbale.find(v => parole.some(p => v.testo.toLowerCase().includes(p)) && v.testo.length > 20)
    const all = capsula(q)?.id ? C.costruito?.allestimenti?.[capsula(q)!.id!] : undefined
    const tavole = (all?.voci.map(v => v.id) ?? T.punti.filter(p => p.q === q).sort((a, b) => b.peso - a.peso).map(p => p.id)).slice(0, 3)
    const via = i < percorso.length - 1 ? Object.values(C.costruito?.nomiVie ?? {})[Math.floor(r() * Object.keys(C.costruito?.nomiVie ?? {}).length)] : undefined
    return { q, nome: Q.nome, parola: Q.concetti.find(w => w === argomento) ?? Q.concetti[0] ?? Q.nome, curatore: cur, voce: b ? { chi: b.chi, nome: nomeDi(b.chi), testo: b.testo } : undefined, tavole, via, colori: sala?.suolo?.colori }
  })
  // il narratore: chi ha parlato di più dell'argomento oggi
  const voci = new Map<string, number>(); for (const b of verbale) if (b.testo.toLowerCase().includes(argomento.toLowerCase().slice(0, 4))) voci.set(b.chi, (voci.get(b.chi) ?? 0) + 1)
  const nar = [...voci.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? tappe[0].curatore ?? C.abitanti[0]?.id
  const dec = (C.decisioni ?? []).filter(d => d.testo).slice(-1)[0]?.testo
  return { giorno: C.giorno, argomento, perche: `se ne è parlato ${lista[0]?.[1] ?? 0} volte oggi, in ${tappe.length} territori`, narratore: { id: nar, nome: nomeDi(nar) }, tappe, decisione: dec }
}

/** il palinsesto diventa la sequenza: copertina, una tappa per territorio, un passaggio per ogni strada, la decisione in fondo */
export function schedeDaPalinsesto(P: Palinsesto): { titolo: string; schede: { ruolo: string; titolo: string; corpo: string; a?: string; b?: string; fonte?: string }[] } {
  const schede: { ruolo: string; titolo: string; corpo: string; a?: string; b?: string; fonte?: string }[] = []
  schede.push({ ruolo: 'copertina', titolo: P.argomento, corpo: `La città oggi parla di ${P.argomento}: un giro per ${P.tappe.map(t => t.nome).join(', ')}. Racconta ${P.narratore.nome}.`, a: P.argomento, fonte: P.narratore.nome })
  P.tappe.forEach((t, i) => {
    schede.push({ ruolo: i === 0 ? 'premessa' : 'passaggio', titolo: t.voce ? t.voce.testo.slice(0, 90) : `In «${t.nome}» si parla di ${t.parola}.`, corpo: t.voce ? `${t.voce.nome}, in «${t.nome}»: ${t.voce.testo}` : `«${t.nome}», curata ${t.curatore ?? 'da nessuno'}.`, a: t.parola, b: P.tappe[i + 1]?.parola, fonte: t.voce?.nome ?? t.nome })
    if (t.via && i < P.tappe.length - 1) schede.push({ ruolo: 'immagine', titolo: t.via, corpo: `Da «${t.nome}» a «${P.tappe[i + 1].nome}», per ${t.via}.`, a: t.parola, b: P.tappe[i + 1].parola })
  })
  schede.push({ ruolo: 'conclusione', titolo: P.decisione ? P.decisione.slice(0, 90) : `Su ${P.argomento} non abbiamo ancora deciso.`, corpo: P.decisione ?? `Ne riparleremo domani in piazza.`, a: P.argomento })
  return { titolo: `${P.argomento} — un giro della città`, schede }
}
