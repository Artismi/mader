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

/** attacchi automatici: argomenti di segno opposto sullo stesso aspetto si attaccano */
export function wireAttacks(args: Argument[]) {
  for (const a of args) for (const b of args) {
    if (a === b || a.polarity === b.polarity) continue
    if (a.aspect === b.aspect && !a.attacks.includes(b.id)) a.attacks.push(b.id)
  }
}
