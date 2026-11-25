// Il cantiere della città: gli abitanti costruiscono la città vera a partire dalle tavole e dai loro legami.
// Accumulo senza piano: ogni giorno qualcuno costruisce, espande, corregge, cataloga, cura o copre qualcosa,
// secondo il suo mestiere e il suo carattere. Quello che è costruito resta (con la sua storia): la città è il palinsesto
// delle sue giornate. La forma è una megastruttura attorno a un nucleo (la poetica): le sale sono capsule innestate,
// più in basso le più antiche, più in alto le nuove; ponti dove i quartieri si legano, scale tra i livelli,
// giardini sui tetti, gallerie esagonali per la biblioteca, torri per le scoperte, gru dove c'è un cantiere.
// Puro: niente DOM.

import type { Territorio, Opera } from './territorio'

export type Pos = { livello: number; angolo: number; raggio: number; x?: number; y?: number }
export type Costruzione = {
  id: string; tipo: 'capsula' | 'ponte' | 'scala' | 'giardino' | 'galleria' | 'torre' | 'gru' | 'graffito' | 'rovina' | 'monumento' | 'nucleo' | 'strada'
  chi: string; giorno: number; nome?: string; pos?: Pos; a?: string; b?: string; q?: number; moduli?: number; dati?: Record<string, unknown>
  stato: 'in piedi' | 'in costruzione' | 'rovina' | 'coperta'; storia: { giorno: number; chi: string; cosa: string }[]
}
export type Cantiere = { costruzioni: Costruzione[]; nomiVie: Record<string, string>; coltivato?: number[] }
export const GRIGLIA = 48 // il terreno coltivato: una griglia sopra il territorio (0..1000)

type Ab = { id: string; nome: string; tipo: string; carattere: Record<string, number> }
type Azione = { chi: string; testo: string; tipo: string }

const pick = <T,>(r: () => number, l: T[]) => l[Math.floor(r() * l.length)]

/** dove sta una capsula: il livello dall'età del quartiere (le antiche in basso), l'angolo dal territorio */
function posDi(T: Territorio, opere: Opera[], q: number): Pos {
  const Q = T.quartieri.find(x => x.id === q)!
  const giorni = T.punti.filter(p => p.q === q).map(p => p.giorno).sort((a, b) => a - b)
  const medio = giorni[Math.floor(giorni.length / 2)] ?? 0, max = Math.max(1, ...opere.map(w => w.day))
  // disteso sulla superficie: dove sta il quartiere nel territorio; l'età resta un dato (le antiche più basse nel terreno)
  return { livello: 0, angolo: Math.atan2(Q.y - T.piazza.y, Q.x - T.piazza.x), raggio: Math.hypot(Q.x - T.piazza.x, Q.y - T.piazza.y), x: Q.x, y: Q.y, eta: medio / max } as Pos
}

export function costruisci(K: Cantiere, T: Territorio, opere: Opera[], abitanti: Ab[], giorno: number, r: () => number, o: { scoperte?: { n: number; testo: string }[]; cantieri?: { cosa: string; chi: string }[]; letture?: number; sale?: Record<string, { curatore: string }> } = {}): Azione[] {
  const az: Azione[] = []
  const nomeDi = (id: string) => abitanti.find(a => a.id === id)?.nome ?? id
  const nuova = (c: Omit<Costruzione, 'id' | 'storia' | 'stato'> & { stato?: Costruzione['stato'] }, cosa: string) => {
    const x: Costruzione = { ...c, id: `${c.tipo}${giorno}.${K.costruzioni.length}`, stato: c.stato ?? 'in piedi', storia: [{ giorno, chi: c.chi, cosa }] }
    K.costruzioni.push(x); return x
  }
  const di = (t: Costruzione['tipo']) => K.costruzioni.filter(c => c.tipo === t && c.stato !== 'rovina')
  const capsulaDi = (q: number) => K.costruzioni.find(c => c.tipo === 'capsula' && c.q === q)
  const chi = (filtro: (a: Ab) => boolean, peso: (a: Ab) => number = () => 1) => { const l = abitanti.filter(filtro); if (!l.length) return null; let x = r() * l.reduce((s, a) => s + peso(a), 0); for (const a of l) if ((x -= peso(a)) <= 0) return a; return l[0] }
  let budget = 3 + Math.floor(r() * 3)

  // il nucleo: c'è dal primo giorno (è la poetica: tutto si innesta lì)
  if (!di('nucleo').length) nuova({ tipo: 'nucleo', chi: 'urbanista', giorno, nome: 'il nucleo', moduli: 4 }, 'ha fondato il nucleo')

  // 1. capsule: ogni quartiere vivo ne vuole una; la costruisce il suo curatore (o chi lo abita di più)
  const vivi = T.quartieri.filter(q => q.n >= 12).sort((a, b) => b.n - a.n)
  let nuove = 0, espansioni = 0
  for (const q of vivi) {
    if (budget <= 1 || (nuove >= 2 && espansioni >= 1)) break
    const c = capsulaDi(q.id), cur = o.sale?.[String(q.id)]?.curatore ?? T.insiemi.filter(s => s.quartieri[0] === q.id)[0]?.abitante.id ?? 'urbanista'
    const moduli = Math.max(1, Math.min(6, Math.round(Math.sqrt(q.n) / 3)))
    if (!c && nuove >= 2) continue
    if (!c) { nuove++; nuova({ tipo: 'capsula', chi: cur, giorno, q: q.id, nome: q.nome, pos: posDi(T, opere, q.id), moduli: 1 }, `ha costruito la sala «${q.nome}»`); az.push({ chi: cur, tipo: 'costruisce', testo: `Ho costruito la sala «${q.nome}», nel punto della città dove stanno le sue tavole.` }); budget--; continue }
    if (c.stato === 'rovina' && q.n >= 20) { c.stato = 'in piedi'; c.storia.push({ giorno, chi: cur, cosa: 'l\'ha restaurata' }); az.push({ chi: cur, tipo: 'restaura', testo: `La capsula «${c.nome}» era in rovina: l'ho rimessa in piedi, il quartiere è tornato a crescere.` }); budget--; continue }
    if ((c.moduli ?? 1) < moduli && espansioni < 1 && r() < 0.5) { espansioni++; c.moduli = (c.moduli ?? 1) + 1; c.storia.push({ giorno, chi: cur, cosa: `l'ha allargata a ${c.moduli} moduli` }); az.push({ chi: cur, tipo: 'espande', testo: `La sala «${c.nome}» non bastava più: le ho aggiunto un'ala (ora ${c.moduli}).` }); budget-- }
  }
  // i quartieri spariti lasciano rovine (niente si cancella)
  for (const c of di('capsula')) if (!T.quartieri.some(q => q.id === c.q && q.n >= 8)) { c.stato = 'rovina'; c.storia.push({ giorno, chi: 'archivio', cosa: 'è rimasta vuota' }); az.push({ chi: 'archivio', tipo: 'rovina', testo: `Nessuno abita più «${c.nome}»: resta lì, come rovina. Non si cancella.` }) }

  // 2. correggere: l'urbanista allontana una sala che sta troppo addosso a un'altra (si deve poter camminare in mezzo)
  if (budget > 0) {
    const caps = di('capsula').filter(c => c.pos?.x != null)
    fuori: for (const a of caps) for (const b of caps) {
      if (a === b) continue
      const dx = b.pos!.x! - a.pos!.x!, dy = b.pos!.y! - a.pos!.y!, d = Math.hypot(dx, dy) || 1
      if (d < 70) { const k = (70 - d) / d; b.pos!.x! += dx * k; b.pos!.y! += dy * k; b.pos!.x = Math.max(20, Math.min(980, b.pos!.x!)); b.pos!.y = Math.max(20, Math.min(980, b.pos!.y!)); b.storia.push({ giorno, chi: 'urbanista', cosa: 'l\'ha spostata un po\' più in là' }); az.push({ chi: 'urbanista', tipo: 'corregge', testo: `«${b.nome}» stava addosso a «${a.nome}»: l'ho spostata più in là, così ci si passa in mezzo.` }); budget--; break fuori }
    }
  }
  // 2b. le strade: come la muffa che collega il cibo, si tracciano tra le sale più legate (prima chi è isolato, poi i legami forti)
  {
    const nodi = [...di('capsula').filter(c => c.pos?.x != null).map(c => ({ id: c.id, q: c.q!, x: c.pos!.x!, y: c.pos!.y! })), { id: 'piazza', q: -1, x: T.piazza.x, y: T.piazza.y }]
    const strade = di('strada'), ha = (a: string, b: string) => strade.some(s => (s.a === a && s.b === b) || (s.a === b && s.b === a))
    const fili = new Map<string, number>(); for (const [a, b] of T.fili) { const qa = T.punti[a].q, qb = T.punti[b].q; if (qa === qb) continue; const k = qa < qb ? `${qa}|${qb}` : `${qb}|${qa}`; fili.set(k, (fili.get(k) ?? 0) + 1) }
    const legame = (a: typeof nodi[0], b: typeof nodi[0]) => a.q < 0 || b.q < 0 ? 4 : fili.get(a.q < b.q ? `${a.q}|${b.q}` : `${b.q}|${a.q}`) ?? 0
    const collegati = new Set<string>(['piazza']); let cambia = true
    while (cambia) { cambia = false; for (const s of strade) { if (collegati.has(s.a!) && !collegati.has(s.b!)) { collegati.add(s.b!); cambia = true } if (collegati.has(s.b!) && !collegati.has(s.a!)) { collegati.add(s.a!); cambia = true } } }
    for (let k = 0; k < 2; k++) {
      let best: [typeof nodi[0], typeof nodi[0], number] | null = null
      for (const a of nodi) for (const b of nodi) {
        if (a === b || ha(a.id, b.id)) continue
        const d = Math.hypot(a.x - b.x, a.y - b.y), unisce = collegati.has(a.id) !== collegati.has(b.id)
        const v = (unisce ? 3 : 0) + Math.log(1 + legame(a, b)) - d / 250
        if (!unisce && legame(a, b) < 20) continue
        if (!best || v > best[2]) best = [a, b, v]
      }
      if (!best) break
      const [a, b] = best, cost = abitanti.find(x => x.id === 'urbanista') ? 'urbanista' : 'geometra'
      nuova({ tipo: 'strada', chi: k === 0 ? cost : 'giardiniere', giorno, a: a.id, b: b.id, dati: { fili: legame(a, b) } }, 'ha tracciato la strada')
      strade.push(K.costruzioni[K.costruzioni.length - 1]); collegati.add(a.id); collegati.add(b.id)
      const nome = (x: typeof nodi[0]) => x.id === 'piazza' ? 'la piazza' : `«${K.costruzioni.find(c => c.id === x.id)?.nome}»`
      az.push({ chi: k === 0 ? cost : 'giardiniere', tipo: 'costruisce', testo: `Ho tracciato una strada tra ${nome(a)} e ${nome(b)}${legame(a, b) > 4 ? ` (${legame(a, b)} fili li legano)` : ''}.` })
    }
  }
  // 2c. il terreno coltivato cresce come la muffa: dal centro verso dove le tavole sono più fitte, lungo le strade e attorno alle sale
  {
    const G = GRIGLIA, dens = new Float32Array(G * G)
    for (const p of T.punti) { const i = Math.min(G - 1, Math.floor(p.x / 1000 * G)), j = Math.min(G - 1, Math.floor(p.y / 1000 * G)); dens[j * G + i] += 0.5 + p.peso }
    const col = new Set(K.coltivato ?? [])
    if (!col.size) { const i = Math.floor(T.piazza.x / 1000 * G), j = Math.floor(T.piazza.y / 1000 * G); for (let dj = -1; dj <= 1; dj++) for (let di2 = -1; di2 <= 1; di2++) col.add((j + dj) * G + i + di2) }
    const vicini = (k: number) => { const i = k % G, j = Math.floor(k / G), v: number[] = []; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x >= 0 && y >= 0 && x < G && y < G) v.push(y * G + x) } return v }
    const vicinoA = new Set<number>(); for (const c of di('capsula')) if (c.pos?.x != null) vicinoA.add(Math.floor(c.pos.y! / 1000 * G) * G + Math.floor(c.pos.x! / 1000 * G))
    const fronte = [...new Set([...col].flatMap(vicini).filter(k => !col.has(k)))]
    const passi = 18 + Math.floor(r() * 14)
    for (let n = 0; n < passi && fronte.length; n++) {
      const pesi = fronte.map(k => 0.05 + dens[k] + (vicinoA.has(k) ? 4 : 0))
      let x = r() * pesi.reduce((a, b) => a + b, 0), scelta = 0; for (let i = 0; i < pesi.length; i++) if ((x -= pesi[i]) <= 0) { scelta = i; break }
      const k = fronte.splice(scelta, 1)[0]; col.add(k); for (const v of vicini(k)) if (!col.has(v) && !fronte.includes(v)) fronte.push(v)
    }
    K.coltivato = [...col]
  }
  // 3. ponti: dove due quartieri hanno molti fili in comune, il geometra (o chi ha più mestiere) getta un ponte
  if (budget > 0) {
    const legami = new Map<string, number>()
    for (const [a, b] of T.fili) { const qa = T.punti[a].q, qb = T.punti[b].q; if (qa === qb) continue; const k = qa < qb ? `${qa}|${qb}` : `${qb}|${qa}`; legami.set(k, (legami.get(k) ?? 0) + 1) }
    const forti = [...legami].sort((x, y) => y[1] - x[1]).filter(([k]) => { const [x, y] = k.split('|').map(Number); return capsulaDi(x) && capsulaDi(y) && !K.costruzioni.some(c => c.tipo === 'ponte' && ((c.a === String(x) && c.b === String(y)) || (c.a === String(y) && c.b === String(x)))) })
    const [k, n] = forti[0] ?? []
    if (k && n! > 8) {
      const [x, y] = k.split('|').map(Number), cost = chi(a => a.id === 'geometra' || a.id === 'urbanista' || a.tipo === 'mestiere', a => a.id === 'geometra' ? 3 : 1)
      if (cost) { nuova({ tipo: 'ponte', chi: cost.id, giorno, a: String(x), b: String(y), dati: { fili: n } }, 'ha gettato il ponte'); az.push({ chi: cost.id, tipo: 'costruisce', testo: `Tra «${capsulaDi(x)!.nome}» e «${capsulaDi(y)!.nome}» passano ${n} fili: ci ho gettato un ponte.` }); budget-- }
    }
  }
  // 4. scale alla Escher: tra capsule a livelli diversi che nessuno collega ancora
  if (budget > 0 && r() < 0.5) {
    const caps = di('capsula').filter(c => c.pos)
    const coppie: [Costruzione, Costruzione][] = []
    for (const a of caps) for (const b of caps) if (a !== b && (a.pos as { eta?: number }).eta! + 0.25 < (b.pos as { eta?: number }).eta! && Math.hypot(a.pos!.x! - b.pos!.x!, a.pos!.y! - b.pos!.y!) < 260 && !K.costruzioni.some(c => c.tipo === 'scala' && ((c.a === a.id && c.b === b.id) || (c.a === b.id && c.b === a.id)))) coppie.push([a, b])
    const p = coppie[Math.floor(r() * coppie.length)]
    if (p) { const cost = chi(a => a.carattere.visionario > 0.5 || a.id === 'urbanista'); if (cost) { nuova({ tipo: 'scala', chi: cost.id, giorno, a: p[0].id, b: p[1].id }, 'ha costruito la scala'); az.push({ chi: cost.id, tipo: 'costruisce', testo: `Ho costruito una scala da «${p[0].nome}», più antica, a «${p[1].nome}», più giovane: si sale dal passato al presente.` }); budget-- } }
  }
  // 5. giardini pensili: la giardiniera semina sul tetto di una capsula, o fa crescere quello che c'è
  if (budget > 0) {
    const gia = di('giardino'), senza = di('capsula').filter(c => !gia.some(g => g.a === c.id))
    const g = gia.length && r() < 0.6 ? gia[Math.floor(r() * gia.length)] : null
    if (g) { g.moduli = Math.min(8, (g.moduli ?? 1) + 1); g.storia.push({ giorno, chi: 'giardiniere', cosa: 'l\'ha fatto crescere' }); az.push({ chi: 'giardiniere', tipo: 'cura', testo: `Il giardino attorno a «${K.costruzioni.find(c => c.id === g.a)?.nome}» è cresciuto.` }); budget-- }
    else if (senza.length) { const c = senza[Math.floor(r() * senza.length)]; nuova({ tipo: 'giardino', chi: 'giardiniere', giorno, a: c.id, moduli: 1 }, 'ha seminato'); az.push({ chi: 'giardiniere', tipo: 'semina', testo: `Ho seminato un giardino attorno a «${c.nome}».` }); budget-- }
  }
  // 6. la biblioteca: gallerie esagonali, una ogni tanto, quando le letture crescono (Babele)
  if (budget > 0 && (o.letture ?? 0) > di('galleria').length * 12 + 6) { const n = di('galleria').length + 1; nuova({ tipo: 'galleria', chi: 'saggista', giorno, nome: `galleria ${n}`, pos: { livello: -n, angolo: n * 2.4, raggio: 40 } }, 'ha scavato la galleria'); az.push({ chi: 'saggista', tipo: 'costruisce', testo: `Accanto alla piazza ho aperto la galleria esagonale numero ${n}: ci stanno le letture di queste settimane.` }); budget-- }
  // 7. torri: ogni scoperta dell'osservatorio che somiglia a noi alza una torre sottile
  for (const s of (o.scoperte ?? []).slice(-2)) if (budget > 0 && !K.costruzioni.some(c => c.tipo === 'torre' && c.dati?.n === s.n)) { nuova({ tipo: 'torre', chi: 'astronoma', giorno, nome: `mondo ${s.n}`, pos: { livello: 0, angolo: (s.n % 628) / 100, raggio: 260 + (s.n % 60) }, dati: { n: s.n, testo: s.testo } }, 'ha alzato la torre'); az.push({ chi: 'astronoma', tipo: 'costruisce', testo: `Ho alzato una torre per il mondo ${s.n}: dalla cima si vede quello che abbiamo trovato.` }); budget-- }
  // 8. gru: ogni cantiere aperto ha la sua gru
  for (const c of (o.cantieri ?? []).slice(-4)) if (!K.costruzioni.some(x => x.tipo === 'gru' && x.nome === c.cosa)) nuova({ tipo: 'gru', chi: c.chi, giorno, nome: c.cosa, stato: 'in costruzione' }, 'ha montato la gru')
  // 9. il gesto d'impulso: chi ha il carattere contrario copre una parete con un graffito (l'originale resta sotto)
  const ribelle = abitanti.filter(a => (a.carattere.contrario ?? 0) > 0.7)[0]
  if (ribelle && r() < 0.25) {
    const caps = di('capsula'), c = caps[Math.floor(r() * caps.length)], altro = T.punti[Math.floor(r() * T.punti.length)]
    if (c) { nuova({ tipo: 'graffito', chi: ribelle.id, giorno, a: c.id, dati: { tavola: altro.id, titolo: altro.titolo } }, 'ha coperto una parete'); az.push({ chi: ribelle.id, tipo: 'copre', testo: `Stanotte ho coperto una parete di «${c.nome}» con «${altro.titolo.slice(0, 60)}», che viene da tutt'altra parte. Sotto c'è ancora tutto.` }) }
  }
  // 10. il monumento: la tavola più amata di sempre, se ancora non ce l'ha
  if (!di('monumento').length) { const best = [...T.punti].sort((a, b) => b.peso - a.peso)[0]; if (best) { nuova({ tipo: 'monumento', chi: 'curatore', giorno, nome: best.titolo, dati: { tavola: best.id } }, 'l\'ha eretto'); az.push({ chi: 'curatore', tipo: 'costruisce', testo: `In piazza c'è ora un monumento: «${best.titolo.slice(0, 70)}».` }) } }
  // 11. catalogare: l'archivio dà un nome alle strade, come in una città vera
  for (const st of di('strada')) if (!K.nomiVie[st.id] && r() < 0.4) {
    const A = K.costruzioni.find(c => c.id === st.a), B = K.costruzioni.find(c => c.id === st.b)
    const w = (x?: Costruzione) => x?.nome ? x.nome.split(' e ')[0] : null
    const a1 = w(A), b1 = w(B)
    K.nomiVie[st.id] = !a1 || !b1 ? `la via della piazza${a1 || b1 ? ` (${a1 ?? b1})` : ''}` : pick(r, [`via ${a1}`, `viale ${a1}-${b1}`, `il passaggio di ${b1}`, `strada dei ${(st.dati?.fili as number) ?? 0} fili`, `calle ${b1}`])
    az.push({ chi: 'archivio', tipo: 'cataloga', testo: `La strada tra «${A?.nome ?? 'la piazza'}» e «${B?.nome ?? 'la piazza'}» ora si chiama ${K.nomiVie[st.id]}.` })
    break
  }
  K.costruzioni = K.costruzioni.slice(-400)
  return az.map(a => ({ ...a, chi: a.chi }))
}
