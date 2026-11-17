/**
 * Argomentazione astratta di Dung con attacchi pesati.
 * Un attacco vale solo se l'attaccante pesa almeno quanto l'80% del bersaglio.
 * L'estensione "grounded" tiene gli argomenti non attaccati e, a catena,
 * quelli difesi da loro: è la posizione più prudente su cui il dibattito
 * può concordare.
 */
import type { Argument } from '../core/types'

export function grounded(args: Argument[]): Set<string> {
  const byId = new Map(args.map(a => [a.id, a]))
  const attackers = new Map<string, string[]>()
  for (const a of args) for (const t of a.attacks) {
    const target = byId.get(t)
    if (!target || a.weight < target.weight * 0.8) continue
    attackers.set(t, [...(attackers.get(t) ?? []), a.id])
  }
  const IN = new Set<string>(), OUT = new Set<string>()
  let changed = true
  while (changed) {
    changed = false
    for (const a of args) {
      if (IN.has(a.id) || OUT.has(a.id)) continue
      const att = attackers.get(a.id) ?? []
      if (att.every(x => OUT.has(x))) { IN.add(a.id); changed = true }
      else if (att.some(x => IN.has(x))) { OUT.add(a.id); changed = true }
    }
  }
  return IN
}

/** chi vince: somma dei pesi degli argomenti accettati, pro contro contro */
export function verdict(args: Argument[], accepted: Set<string>) {
  let pro = 0, contro = 0
  for (const a of args) if (accepted.has(a.id)) { if (a.polarity === 'pro') pro += a.weight; else contro += a.weight }
  return { pro, contro, keep: pro >= contro }
}

/**
 * Attacchi: sullo stesso aspetto i segni opposti si attaccano; in più ogni
 * argomento attacca i due più forti del fronte opposto (chi difende l'opera
 * risponde a chi la smonta, e viceversa). Se due si attaccano con forza
 * simile restano entrambi in sospeso: non reggono.
 */
export function wireAttacks(args: Argument[]) {
  const pros = args.filter(a => a.polarity === 'pro').sort((a, b) => b.weight - a.weight)
  const cons = args.filter(a => a.polarity === 'contro').sort((a, b) => b.weight - a.weight)
  const link = (a: Argument, b: Argument) => { if (!a.attacks.includes(b.id)) a.attacks.push(b.id) }
  for (const a of args) for (const b of args) if (a !== b && a.polarity !== b.polarity && a.aspect === b.aspect) link(a, b)
  for (const a of pros) for (const b of cons.slice(0, 2)) link(a, b)
  for (const a of cons) for (const b of pros.slice(0, 2)) link(a, b)
}
