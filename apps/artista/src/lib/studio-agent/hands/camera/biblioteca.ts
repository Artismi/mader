/**
 * La biblioteca: come quella di Babele di Borges, contiene tutti gli universi possibili, ognuno con un numero.
 * Dal numero il caso (ripetibile) mette nella cella solo ciò che la natura ci mette: un campo magnetico che varia
 * dolcemente (onde), nubi di materia, qualche cristallo (l'unica ripetizione che non è una copia), masse sparse,
 * una pioggia di raggi cosmici dai bordi, decadimenti spontanei, stelle nucleari (un nucleo colpito si spezza in una
 * raggiera: nel campo le cariche positive e negative si arricciano in versi opposti), fotoni che si convertono in coppie.
 * Gli universi hanno «regimi» diversi (campo forte, materia densa, gravità, cristallo, quiete): la varietà è enorme.
 */
import { generatore, hash, type Mondo, type Onda, type Specie, type Sorgente } from './mondo'

const CATALOGO: Record<string, Specie> = {
  elettrone: { q: -1, m: 1 },
  positrone: { q: 1, m: 1 },
  muone: { q: -1, m: 4, vitaMedia: 70, figli: [{ specie: 'elettrone', angolo: [-35, 35], quota: [0.5, 0.95] }] },
  antimuone: { q: 1, m: 4, vitaMedia: 70, figli: [{ specie: 'positrone', angolo: [-35, 35], quota: [0.5, 0.95] }] },
  'pione+': { q: 1, m: 6, vitaMedia: 30, figli: [{ specie: 'antimuone', angolo: [-25, 25], quota: [0.6, 0.9] }] },
  'pione-': { q: -1, m: 6, vitaMedia: 30, figli: [{ specie: 'muone', angolo: [-25, 25], quota: [0.6, 0.9] }] },
  protone: { q: 1, m: 40 },
  alfa: { q: 2, m: 120 },
  kaone0: { q: 0, m: 9, vitaMedia: 18, figli: [{ specie: 'pione+', angolo: [-55, -12], quota: [0.6, 1] }, { specie: 'pione-', angolo: [12, 55], quota: [0.6, 1] }] },
  fotone: { q: 0, m: 0, luce: true, vitaMedia: 14, figli: [{ specie: 'elettrone', angolo: [-9, -1], quota: [0.2, 0.5] }, { specie: 'positrone', angolo: [1, 9], quota: [0.2, 0.5] }] },
}

export interface Universo { numero: number; regime: string; cella: Mondo }

export function universo(numero: number): Universo {
  const c = generatore(hash(`universo/${numero}`)), tra = (a: number, b: number) => a + c() * (b - a), intero = (a: number, b: number) => Math.floor(tra(a, b + 1))
  const W = 1000, H = 1000, T = 200
  // il regime: che cosa domina questo universo
  const regimi = ['campo', 'materia', 'gravita', 'cristallo', 'quiete', 'tempesta']
  const regime = regimi[Math.floor(c() * regimi.length)]
  const onda = (amp: number, lmin: number, lmax: number): Onda => { const l = tra(lmin, lmax), a = tra(0, Math.PI * 2); return { k: [(Math.cos(a) * 2 * Math.PI) / l, (Math.sin(a) * 2 * Math.PI) / l], a: amp * tra(0.4, 1), fi: tra(0, Math.PI * 2) } }
  const forte = regime === 'campo' || regime === 'tempesta' ? 1.8 : regime === 'quiete' ? 0.4 : 1
  const fondoB = (c() < 0.75 ? 1 : 0) * (c() < 0.5 ? -1 : 1) * tra(0.01, 0.1) * forte
  const onde = Array.from({ length: intero(0, 4) }, () => onda(0.12 * forte, 120, 900))
  const nubi = regime === 'materia' || c() < 0.3 ? { K: tra(0.4, regime === 'materia' ? 8 : 3), modi: Array.from({ length: 3 }, () => onda(1, 200, 700)) } : null
  const fondoK = c() < 0.2 ? tra(0.05, 0.6) : 0
  const cristalli = regime === 'cristallo' || c() < 0.15 ? Array.from({ length: intero(1, 2) }, () => ({ centro: [tra(200, 800), tra(200, 800)] as [number, number], r: tra(180, 420), passo: tra(22, 90), angolo: tra(0, Math.PI), a: tra(0.12, 0.45) })) : []
  const masse = regime === 'gravita' || c() < 0.15 ? Array.from({ length: intero(1, 4) }, () => ({ pos: [tra(150, 850), tra(150, 850)] as [number, number], M: tra(1500, 18000), R: tra(4, 20) })) : []
  const specie: Record<string, Specie> = { ...CATALOGO }
  const sorgenti: Sorgente[] = []
  const quanti = regime === 'tempesta' ? 2 : regime === 'quiete' ? 0.5 : 1
  // la pioggia di raggi cosmici dai bordi
  const cariche = ['protone', 'pione+', 'pione-', 'elettrone', 'positrone', 'muone', 'antimuone', 'alfa']
  for (let i = 0; i < Math.round(intero(3, 12) * quanti); i++) {
    const lato = intero(0, 3), u = tra(0.05, 0.95), nrm = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][lato]
    const pos: [number, number] = [[u * W, 1], [W - 1, u * H], [u * W, H - 1], [1, u * H]][lato] as [number, number]
    sorgenti.push({ pos, dir: nrm + tra(-1.1, 1.1), v: tra(6, 15), t0: tra(0, 0.5 * T), specie: cariche[intero(0, cariche.length - 1)] })
  }
  // decadimenti spontanei: kaoni neutri che si aprono in forcelle
  for (let i = 0; i < Math.round(intero(0, 8) * quanti); i++) sorgenti.push({ pos: [tra(100, 900), tra(100, 900)], dir: tra(0, 6.283), v: tra(7, 12), t0: tra(0, 0.6 * T), specie: 'kaone0' })
  // fotoni che si convertono in coppie (le due spirali opposte)
  for (let i = 0; i < Math.round(intero(0, 7) * quanti); i++) sorgenti.push({ pos: [tra(50, 950), tra(50, 950)], dir: tra(0, 6.283), v: 30, t0: tra(0, 0.6 * T), specie: 'fotone' })
  // stelle nucleari: un nucleo fermo che esplode in una raggiera di cariche di segno misto
  for (let i = 0; i < Math.round(intero(0, 5) * quanti); i++) {
    const n = intero(3, 9), nome = `stella${i}`, a0 = tra(0, 360)
    specie[nome] = { q: 0, m: 50, vitaMedia: 0.01, visibile: false, figli: Array.from({ length: n }, (_, j) => ({ specie: cariche[intero(0, 6)], angolo: a0 + (j * 360) / n + tra(-18, 18), quota: [1, 1] as [number, number] })) }
    // la «velocità» della stella è quella che passa alle figlie
    sorgenti.push({ pos: [tra(120, 880), tra(120, 880)], dir: 0, v: tra(5, 12), t0: tra(0, 0.5 * T), specie: nome })
  }
  if (sorgenti.length < 6) for (let i = sorgenti.length; i < 6; i++) sorgenti.push({ pos: [tra(100, 900), tra(100, 900)], dir: tra(0, 6.283), v: tra(7, 12), t0: tra(0, 0.4 * T), specie: 'kaone0' })
  const cella: Mondo = {
    larghezza: W, altezza: H, tempo: T, seme: numero, G: 1,
    fondo: { B: fondoB, K: fondoK }, onde, nubi, cristalli, masse,
    pellicola: { w0: tra(0.7, 2), saturazione: tra(3, 6), vRif: tra(7, 12) },
    specie, sorgenti,
  }
  return { numero, regime, cella }
}
