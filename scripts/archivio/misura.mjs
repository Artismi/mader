#!/usr/bin/env node
/**
 * G2, misura a secco: confronta due giri della vetrina (senza e con G2) sul
 * campione standard. Carattere e diversità vengono da diversita.json, i difetti
 * da rapporto.json (vetrina con --misura), la riconoscibilità dalle impronte di
 * layout delle prime 12: per ogni tavola, la distanza dalla media
 * dell'archetipo più vicino (medie calcolate sul giro senza G2, lasciando fuori
 * la tavola stessa). Più è alta, meno la tavola "sa di archetipo".
 *
 *   node scripts/archivio/misura.mjs scripts/designer/out/g2-senza scripts/designer/out/g2-con
 */
import fs from 'node:fs'
import path from 'node:path'

const [senzaDir, conDir] = process.argv.slice(2)
const leggi = d => ({ rapporto: JSON.parse(fs.readFileSync(path.join(d, 'rapporto.json'), 'utf8')), diversita: JSON.parse(fs.readFileSync(path.join(d, 'diversita.json'), 'utf8')) })
const S = leggi(senzaDir), C = leggi(conDir)
const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s / a.length) }
const famiglia = s => (s.startsWith('esempi') ? 'esempi' : s.split(':')[0].split(' ')[0])

// medie degli archetipi dal giro senza G2
const gruppi = new Map()
for (const r of S.rapporto) for (const t of r.prime ?? []) if (t.impronta) { const k = famiglia(t.sistema); if (!gruppi.has(k)) gruppi.set(k, []); gruppi.get(k).push(t) }
const media = (l, via) => { const v = l.filter(t => t !== via); if (!v.length) return null; const m = new Array(v[0].impronta.length).fill(0); for (const t of v) t.impronta.forEach((x, i) => (m[i] += x / v.length)); return m }

function misura(R, D) {
  const prime = R.flatMap(r => r.prime ?? [])
  const d = prime.filter(t => t.impronta).map(t => Math.min(...[...gruppi.entries()].map(([, l]) => media(l, t)).filter(Boolean).map(m => dist(t.impronta, m))))
  const conDifetto = t => t.difetti && (t.difetti.sovrapposizioni?.length || t.difetti.contrasto?.length || t.difetti.saltati?.length || t.difetti.tagliati?.length || t.difetti.vuoti?.length)
  const tutteDiff = prime.filter(t => t.difetti)
  return {
    tavole: prime.length,
    g2: prime.filter(t => famiglia(t.sistema) === 'esempi').length,
    carattere: +D.carattere.toFixed(1),
    diversita: +D.visiva.toFixed(3),
    sane: tutteDiff.length ? `${tutteDiff.filter(t => !conDifetto(t)).length}/${tutteDiff.length}` : 'n.d.',
    sovrapposizioni: tutteDiff.reduce((a, t) => a + (t.difetti.sovrapposizioni?.length ?? 0), 0),
    contrasto: tutteDiff.reduce((a, t) => a + (t.difetti.contrasto?.length ?? 0), 0),
    saltati: tutteDiff.reduce((a, t) => a + (t.difetti.saltati?.length ?? 0), 0),
    distanzaArchetipi: +(d.reduce((a, x) => a + x, 0) / Math.max(1, d.length)).toFixed(4),
    voto: +(prime.reduce((a, t) => a + (t.voto ?? 0), 0) / Math.max(1, prime.length)).toFixed(1),
  }
}
const ms = misura(S.rapporto, S.diversita), mc = misura(C.rapporto, C.diversita)
// soglia "si riconosce": la mediana delle distanze del giro senza G2
const tutte = R => R.flatMap(r => r.prime ?? []).filter(t => t.impronta).map(t => Math.min(...[...gruppi.values()].map(l => media(l, t)).filter(Boolean).map(m => dist(t.impronta, m))))
const ds = tutte(S.rapporto).sort((a, b) => a - b), soglia = ds[ds.length >> 1]
ms.riconoscibili = `${tutte(S.rapporto).filter(x => x < soglia).length}/${ds.length}`
mc.riconoscibili = `${tutte(C.rapporto).filter(x => x < soglia).length}/${tutte(C.rapporto).length}`
const righe = Object.keys(ms).map(k => `| ${k} | ${ms[k]} | ${mc[k]} |`)
const md = ['# G2: misura a secco, campione standard', '', `Senza G2: \`${senzaDir}\` · con G2: \`${conDir}\`. Prime 12 per contenuto. distanzaArchetipi = distanza media (impronta di layout) dalla media dell'archetipo più vicino; riconoscibili = tavole sotto la mediana del giro senza G2.`, '', '| misura | senza G2 | con G2 |', '|---|---|---|', ...righe, ''].join('\n')
fs.writeFileSync(path.join(conDir, 'misura-g2.md'), md)
console.log(md)
