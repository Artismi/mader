// Il territorio: tutte le tavole nello spazio per somiglianza (concetti, mani, occhio, registro).
// Le simili stanno vicine e formano quartieri; ogni abitante ha il suo insieme (le tavole che lo riguardano),
// una casa (dove il suo insieme è più fitto) e un cerchio. Dove gli insiemi si sovrappongono tutti c'è la piazza.
// Strato 1 della città interna: solo geometria e appartenenze, nessuna decisione. Puro: niente DOM, gira anche in node.

export type Opera = {
  id: string; day: number; title?: string; text?: string; kept?: boolean; interest?: number
  intention?: { word?: string; register?: string }
  readings?: { title?: string; source?: string }[]
  gestures?: { tool: string; kept?: boolean }[]
  visual?: { features?: Record<string, number> }
}

export type Abitante = { id: string; nome: string; tipo: 'mestiere' | 'testa'; strumenti?: string[]; parole?: string[] }

export type Punto = { id: string; x: number; y: number; q: number; giorno: number; titolo: string; peso: number }
export type Quartiere = { id: number; nome: string; x: number; y: number; n: number; concetti: string[]; mani: string[] }
export type Insieme = { abitante: Abitante; casa: { x: number; y: number }; raggio: number; n: number; quartieri: number[]; membri: Record<string, number> }
export type Territorio = {
  punti: Punto[]; quartieri: Quartiere[]; insiemi: Insieme[]
  incroci: { a: string; b: string; quanto: number }[]
  piazza: { x: number; y: number }; fili: [number, number, number][]
}

// ── i mestieri: famiglie di strumenti (le mani). Il nome è quello del doc; il test è sul nome dello strumento ──
export const MESTIERI: Abitante[] = [
  { id: 'ritagliatore', nome: 'il ritagliatore', tipo: 'mestiere', strumenti: ['taglia', 'affettatore', 'stiro', 'schiaccia', 'collage'] },
  { id: 'redattore', nome: 'la redattrice', tipo: 'mestiere', strumenti: ['togli', 'firma', 'griglia', 'per-il-post'] },
  { id: 'geometra', nome: 'il geometra', tipo: 'mestiere', strumenti: ['geometria', 'pattern', 'ornato', 'caleido', 'ripeti', 'disponi', 'motivi', 'tasselli', 'mosaico'] },
  { id: 'ottico', nome: "l'ottico", tipo: 'mestiere', strumenti: ['luce', 'ombra', 'luce3d', 'vetro', 'camera', 'shader', 'sfasa', 'deforma'] },
  { id: 'stampatore', nome: 'lo stampatore', tipo: 'mestiere', strumenti: ['grana', 'retino', 'duotono', 'filtro', 'dither', 'materia', 'colore', 'stile', 'memoria', 'colata'] },
  { id: 'giardiniere', nome: 'la giardiniera', tipo: 'mestiere', strumenti: ['semina', 'traccia', 'flusso', 'sciame', 'particelle', 'albero', 'muffa', 'crescita', 'fumo', 'macchia'] },
  { id: 'alchimista', nome: "l'alchimista", tipo: 'mestiere', strumenti: ['acqua', 'cristallo', 'ondine', 'campo', 'universo'] },
  { id: 'tipografo', nome: 'il tipografo', tipo: 'mestiere', strumenti: ['scrivi', 'tipografia', 'pagina', 'episodio', 'copertina', 'parola'] },
]

const VUOTE = new Set('bensi quanto presente presenza essendo della delle dello degli dalla dalle dagli nella nelle negli sulla sulle sugli alla alle agli come cosa sono essere anche quando dove perche questo questa quello quella tutto tutti ogni loro forse niente stesso stessa altro altra prima dopo ancora sempre modo parte tipo volta fanno fatto lascia tiene tengo prova rima gesto stessa sembri sembra somiglia quanto letto credevo cercare costretto guardare diversamente interesse caduto retto tradisce scena redazione volte annullato gesti guardati effetto cambiato luglio maggio giugno aprile marzo gennaio febbraio agosto settembre ottobre novembre dicembre primo prima grande tale fosse ucciso decimo momento verso oggi giorno rapporto particolare italiana'.split(' '))
export const radice = (w: string) => { const n = w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); return VUOTE.has(n) ? null : n.replace(/[aeiou]$/, '') }
const parole = (t: string) => String(t ?? '').toLowerCase().split(/[^a-zàèéìòù]+/).filter(w => w.length >= 5).map(radice).filter(Boolean) as string[]

const famiglia = (tool: string) => {
  const t = tool.toLowerCase()
  for (const m of MESTIERI) if (m.strumenti!.some(s => t.includes(s))) return m.id
  return null
}

const FEAT = ['luminosita', 'contrasto', 'densita', 'bordi', 'orizzontali', 'diagonali', 'verticali', 'simmetria', 'vuoto', 'entropia', 'complessita', 'saturazione', 'tinte', 'punti', 'linee']

function caso(seme: number) { let z = seme >>> 0; return () => { z = (z + 0x6d2b79f5) >>> 0; let t = z; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

type Vec = Map<string, number>
const norma = (v: Vec) => { let s = 0; for (const x of v.values()) s += x * x; s = Math.sqrt(s) || 1; for (const [k, x] of v) v.set(k, x / s); return v }
const cos = (a: Vec, b: Vec) => { let s = 0; const [p, q] = a.size < b.size ? [a, b] : [b, a]; for (const [k, x] of p) { const y = q.get(k); if (y) s += x * y } return s }

/** costruisce il territorio da tutte le opere (anche gli scarti: sono pezzi di strada). */
export function territorio(opere: Opera[], o: { k?: number; giri?: number; seme?: number; teste?: number; risoluzione?: number } = {}): Territorio {
  const K = o.k ?? 10, r = caso(o.seme ?? 7)
  const N = opere.length
  // 1. tre vettori per opera: concetti (tf-idf), mani (famiglie e strumenti, tf-idf), occhio (forma visiva)
  const conc: Vec[] = [], mani: Vec[] = [], occ: (number[] | null)[] = [], fam: Map<string, number>[] = []
  const df = new Map<string, number>(), dfm = new Map<string, number>()
  for (const w of opere) {
    const c = new Map<string, number>()
    const add = (k: string | null, p: number) => { if (k) c.set(k, (c.get(k) ?? 0) + p) }
    add(w.intention?.word ? radice(w.intention.word) : null, 3)
    for (const p of parole(w.title ?? '')) add(p, 1.5)
    for (const p of parole((w.text ?? '').slice(0, 600))) add(p, 0.4)
    for (const l of w.readings ?? []) { add(l.source ? 'src:' + l.source : null, 0.6); for (const p of parole(l.title ?? '')) add(p, 0.5) }
    if (w.intention?.register) add('reg:' + w.intention.register, 1)
    conc.push(c); for (const k of c.keys()) df.set(k, (df.get(k) ?? 0) + 1)
    const m = new Map<string, number>(), f = new Map<string, number>()
    for (const g of w.gestures ?? []) if (g.kept !== false) { const t = g.tool.replace(/^(scena|redazione|episodio|pagina):/, ''); m.set(t, (m.get(t) ?? 0) + 1); const fa = famiglia(g.tool); if (fa) { f.set(fa, (f.get(fa) ?? 0) + 1); m.set('fam:' + fa, (m.get('fam:' + fa) ?? 0) + 0.5) } }
    mani.push(m); fam.push(f); for (const k of m.keys()) dfm.set(k, (dfm.get(k) ?? 0) + 1)
    const F = w.visual?.features; occ.push(F ? FEAT.map(k => F[k] ?? 0) : null)
  }
  // il tema: la parola scelta e il titolo (per dare i nomi: il testo lungo è pieno di parole di passaggio)
  const tema: Map<string, number>[] = opere.map(w => { const t = new Map<string, number>(); const v = w.intention?.word ? radice(w.intention.word) : null; if (v) t.set(v, 3); for (const p of parole(w.title ?? '')) t.set(p, (t.get(p) ?? 0) + 1); return t })
  const dft = new Map<string, number>(); for (const t of tema) for (const k of t.keys()) dft.set(k, (dft.get(k) ?? 0) + 1)
  const dff = new Map<string, number>(); for (const f of fam) for (const k of f.keys()) dff.set(k, (dff.get(k) ?? 0) + 1)
  const idfFam = new Map([...dff].map(([k, d]) => [k, Math.log(1 + N / d)]))
  conc.forEach(c => { for (const [k, x] of c) { const d = df.get(k)!; c.set(k, d < 2 || d > N * 0.4 ? 0 : x * Math.log(N / d)) } ; for (const [k, x] of c) if (!x) c.delete(k); norma(c) })
  mani.forEach(m => { for (const [k, x] of m) m.set(k, Math.sqrt(x) * Math.log(1 + N / dfm.get(k)!)); norma(m) })
  // l'occhio: standardizzato per caratteristica
  const mu = FEAT.map((_, j) => { const v = occ.filter(Boolean).map(x => x![j]); return v.reduce((a, b) => a + b, 0) / (v.length || 1) })
  const sd = FEAT.map((_, j) => { const v = occ.filter(Boolean).map(x => x![j]); return Math.sqrt(v.reduce((a, b) => a + (b - mu[j]) ** 2, 0) / (v.length || 1)) || 1 })
  const occZ = occ.map(x => x ? x.map((v, j) => (v - mu[j]) / sd[j]) : null)
  const sim = (a: number, b: number) => {
    const sc = cos(conc[a], conc[b]), sm = cos(mani[a], mani[b])
    let so = 0, wo = 0
    if (occZ[a] && occZ[b]) { let d = 0; for (let j = 0; j < FEAT.length; j++) d += (occZ[a]![j] - occZ[b]![j]) ** 2; so = Math.exp(-d / (2 * FEAT.length)); wo = 0.2 }
    return (0.5 * sc + 0.3 * sm + wo * so) / (0.8 + wo)
  }
  // 2. i vicini: per ognuna le K più simili (indice invertito per non fare tutte le coppie a vuoto)
  const inv = new Map<string, number[]>()
  conc.forEach((c, i) => { for (const k of c.keys()) { let l = inv.get(k); if (!l) inv.set(k, l = []); l.push(i) } })
  mani.forEach((m, i) => { for (const k of m.keys()) { const kk = 'm:' + k; let l = inv.get(kk); if (!l) inv.set(kk, l = []); l.push(i) } })
  const vicini: [number, number][][] = []
  for (let i = 0; i < N; i++) {
    const cand = new Set<number>()
    const chiavi = [...conc[i].entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0]).concat([...mani[i].entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => 'm:' + e[0]))
    for (const k of chiavi) { const l = inv.get(k)!; if (l.length > 400) { for (let t = 0; t < 60; t++) cand.add(l[Math.floor(r() * l.length)]) } else for (const j of l) cand.add(j) }
    for (let t = 0; t < 20; t++) cand.add(Math.floor(r() * N)) // un po' di strade a caso
    for (const d of [-2, -1, 1, 2]) if (i + d >= 0 && i + d < N) cand.add(i + d) // lo stesso giorno, lo stesso pensiero
    cand.delete(i)
    vicini.push([...cand].map(j => [j, sim(i, j)] as [number, number]).sort((a, b) => b[1] - a[1]).slice(0, K))
  }
  // i fili: archi simmetrici
  const arco = new Map<string, number>()
  vicini.forEach((v, i) => v.forEach(([j, s]) => { if (s <= 0.02) return; const key = i < j ? `${i}|${j}` : `${j}|${i}`; arco.set(key, Math.max(arco.get(key) ?? 0, s)) }))
  const fili: [number, number, number][] = [...arco].map(([k, s]) => { const [a, b] = k.split('|').map(Number); return [a, b, s] })
  // 3. la disposizione: si parte dal tempo (spirale: le prime al centro), poi i fili attirano e i lontani si respingono
  const X = new Float64Array(N), Y = new Float64Array(N)
  opere.forEach((w, i) => { const a = i * 2.39996, rr = Math.sqrt(i + 1) * 3; X[i] = Math.cos(a) * rr; Y[i] = Math.sin(a) * rr })
  const giri = o.giri ?? 300
  for (let ep = 0; ep < giri; ep++) {
    const lr = 1 - ep / giri
    for (const [a, b, s] of fili) {
      const dx = X[b] - X[a], dy = Y[b] - Y[a], d2 = dx * dx + dy * dy + 1e-3
      const f = Math.min(4, s * 2 * lr * (1 - 1 / (1 + d2 * 0.02)) * 0.6)
      X[a] += dx * f * 0.05; Y[a] += dy * f * 0.05; X[b] -= dx * f * 0.05; Y[b] -= dy * f * 0.05
      for (let t = 0; t < 2; t++) { // spinta da due a caso
        const c = Math.floor(r() * N); if (c === a) continue
        const ex = X[a] - X[c], ey = Y[a] - Y[c], e2 = ex * ex + ey * ey + 0.5
        const g = Math.min(4, 6 / e2) * lr
        X[a] += ex * g; Y[a] += ey * g
      }
    }
  }
  // normalizza in 0..1000
  const nx = [Math.min(...X), Math.max(...X)], ny = [Math.min(...Y), Math.max(...Y)], sc = 1000 / Math.max(nx[1] - nx[0], ny[1] - ny[0])
  for (let i = 0; i < N; i++) { X[i] = (X[i] - nx[0]) * sc; Y[i] = (Y[i] - ny[0]) * sc }
  // 4. i quartieri: le etichette si propagano lungo i fili (vince la più votata tra i vicini)
  const adj: [number, number][][] = Array.from({ length: N }, () => [])
  for (const [a, b, s] of fili) { adj[a].push([b, s]); adj[b].push([a, s]) }
  let lab = louvain(N, fili, r, o.risoluzione ?? 1)
  // i quartieri piccoli si uniscono al vicino più legato
  const minimo = Math.max(8, Math.round(N / 80))
  for (let pass = 0; pass < 3; pass++) {
    const cnt = new Map<number, number>(); lab.forEach(l => cnt.set(l, (cnt.get(l) ?? 0) + 1))
    for (let i = 0; i < N; i++) if (cnt.get(lab[i])! < minimo) { const v = new Map<number, number>(); for (const [j, s] of adj[i]) if (cnt.get(lab[j])! >= minimo) v.set(lab[j], (v.get(lab[j]) ?? 0) + s); let best = lab[i], bw = 0; for (const [l, w] of v) if (w > bw) { bw = w; best = l } if (best === lab[i]) { let bd = 1e18; for (let j = 0; j < N; j++) if (cnt.get(lab[j])! >= minimo) { const d = (X[i] - X[j]) ** 2 + (Y[i] - Y[j]) ** 2; if (d < bd) { bd = d; best = lab[j] } } } lab[i] = best }
  }
  const idQ = new Map<number, number>(); lab = lab.map(l => { if (!idQ.has(l)) idQ.set(l, idQ.size); return idQ.get(l)! })
  // il nome del quartiere: i concetti e le mani che lo distinguono dal resto
  const quartieri: Quartiere[] = [...idQ.values()].map(q => {
    const mem = lab.map((l, i) => l === q ? i : -1).filter(i => i >= 0)
    const tc = new Map<string, number>(), tm = new Map<string, number>()
    for (const i of mem) { for (const [k, x] of tema[i]) tc.set(k, (tc.get(k) ?? 0) + x); for (const [k, n] of fam[i]) tm.set(k, (tm.get(k) ?? 0) + n * (idfFam.get(k) ?? 1)) }
    const forma = new Map<string, string>()
    for (const i of mem) for (const w of String(opere[i].title ?? '').toLowerCase().split(/[^a-zàèéìòù]+/)) { const k = w.length >= 5 ? radice(w) : null; if (k && !forma.has(k)) forma.set(k, w) }
    for (const i of mem) { const w = opere[i].intention?.word; if (w) { const k = radice(w); if (k && !forma.has(k)) forma.set(k, w) } }
    const concetti = [...tc].filter(([k]) => (dft.get(k) ?? 0) >= 3).map(([k, x]) => [k, x / Math.sqrt(dft.get(k)!)] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => forma.get(k) ?? k)
    const mani = [...tm].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k)
    const cx = mem.reduce((a, i) => a + X[i], 0) / mem.length, cy = mem.reduce((a, i) => a + Y[i], 0) / mem.length
    return { id: q, nome: concetti.slice(0, 2).join(' e ') || `quartiere ${q}`, x: cx, y: cy, n: mem.length, concetti, mani }
  })
  // 5. gli abitanti: i mestieri dalle mani, le teste dai concetti più frequenti nelle letture e nei titoli
  const teste: Abitante[] = []
  {
    const tot = new Map<string, number>()
    for (const w of opere) { const v = w.intention?.word ? radice(w.intention.word) : null; if (v && (df.get(v) ?? 0) <= N * 0.4) tot.set(v, (tot.get(v) ?? 0) + 1) }
    const forma = new Map<string, string>(); for (const w of opere) { const v = w.intention?.word; if (v) { const k = radice(v); if (k && !forma.has(k)) forma.set(k, v) } }
    const usati = new Set<string>()
    for (const [k] of [...tot].sort((a, b) => b[1] - a[1])) {
      if (teste.length >= (o.teste ?? 6)) break
      if (usati.has(k) || !forma.has(k)) continue
      // una testa raccoglie la parola e quelle che le stanno spesso accanto
      const vic = new Map<string, number>()
      conc.forEach(c => { if (c.has(k)) for (const [j, x] of c) if (j !== k && !j.includes(':')) vic.set(j, (vic.get(j) ?? 0) + x) })
      const altre = [...vic].sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0])
      ;[k, ...altre].forEach(x => usati.add(x))
      teste.push({ id: 'testa:' + k, nome: `chi pensa a «${forma.get(k)}»`, tipo: 'testa', parole: [k, ...altre] })
    }
  }
  const abitanti = [...MESTIERI, ...teste]
  const G0 = 40, densTutte = new Float64Array(G0 * G0)
  for (let i = 0; i < N; i++) { const gx = X[i] / 1000 * (G0 - 1), gy = Y[i] / 1000 * (G0 - 1); for (let a = Math.max(0, Math.floor(gx - 4)); a <= Math.min(G0 - 1, Math.ceil(gx + 4)); a++) for (let b = Math.max(0, Math.floor(gy - 4)); b <= Math.min(G0 - 1, Math.ceil(gy + 4)); b++) { const dx = (a - gx) * 1000 / (G0 - 1), dy = (b - gy) * 1000 / (G0 - 1); densTutte[b * G0 + a] += Math.exp(-(dx * dx + dy * dy) / (2 * 60 * 60)) } }
  const insiemi: Insieme[] = abitanti.map(ab => {
    const memb = new Float64Array(N)
    for (let i = 0; i < N; i++) {
      if (ab.tipo === 'mestiere') { let t = 0; for (const [k, n] of fam[i]) t += n * idfFam.get(k)!; memb[i] = t ? (fam[i].get(ab.id) ?? 0) * (idfFam.get(ab.id) ?? 1) / t : 0 }
      else memb[i] = Math.min(1, ab.parole!.reduce((a, k) => a + (conc[i].get(k) ?? 0) * (k === ab.parole![0] ? 2 : 1), 0))
    }
    const tot = memb.reduce((a, b) => a + b, 0) || 1
    // la casa: dove l'insieme è più fitto (densità a nucleo su una griglia grossa)
    const G = 40, dens = new Float64Array(G * G), h = 60
    for (let i = 0; i < N; i++) if (memb[i] > 0.05) { const gx = X[i] / 1000 * (G - 1), gy = Y[i] / 1000 * (G - 1); for (let a = Math.max(0, Math.floor(gx - 4)); a <= Math.min(G - 1, Math.ceil(gx + 4)); a++) for (let b = Math.max(0, Math.floor(gy - 4)); b <= Math.min(G - 1, Math.ceil(gy + 4)); b++) { const dx = (a - gx) * 1000 / (G - 1), dy = (b - gy) * 1000 / (G - 1); dens[b * G + a] += memb[i] * Math.exp(-(dx * dx + dy * dy) / (2 * h * h)) } }
    // non dove ci sono più tavole in assoluto, ma dove le sue pesano di più rispetto al resto
    let bi = 0, bv = -1; for (let j = 0; j < G * G; j++) { const v = dens[j] * dens[j] / (densTutte[j] + 0.5); if (v > bv) { bv = v; bi = j } }
    const casa = { x: (bi % G) * 1000 / (G - 1), y: Math.floor(bi / G) * 1000 / (G - 1) }
    // il cerchio: la distanza che comprende il 60% del suo peso
    const ds = [...memb].map((m, i) => [Math.hypot(X[i] - casa.x, Y[i] - casa.y), m] as [number, number]).filter(e => e[1] > 0).sort((a, b) => a[0] - b[0])
    let acc = 0, raggio = 0; for (const [d, m] of ds) { acc += m; raggio = d; if (acc >= tot * 0.6) break }
    const qp = new Map<number, number>(); for (let i = 0; i < N; i++) if (memb[i] > 0.1) qp.set(lab[i], (qp.get(lab[i]) ?? 0) + memb[i])
    const membri: Record<string, number> = {}; for (let i = 0; i < N; i++) if (memb[i] > 0.15) membri[opere[i].id] = +memb[i].toFixed(2)
    return { abitante: ab, casa, raggio, n: Object.keys(membri).length, quartieri: [...qp].sort((a, b) => b[1] - a[1]).slice(0, 4).map(e => e[0]), membri }
  })
  // 6. gli incroci: quanto due insiemi condividono (Jaccard pesato)
  const incroci: Territorio['incroci'] = []
  for (let a = 0; a < insiemi.length; a++) for (let b = a + 1; b < insiemi.length; b++) {
    const A = insiemi[a].membri, B = insiemi[b].membri; let mn = 0, mx = 0
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { mn += Math.min(A[k] ?? 0, B[k] ?? 0); mx += Math.max(A[k] ?? 0, B[k] ?? 0) }
    if (mx) incroci.push({ a: insiemi[a].abitante.id, b: insiemi[b].abitante.id, quanto: +(mn / mx).toFixed(3) })
  }
  // 7. la piazza: il punto da cui le case sono più vicine tutte insieme (pesando i raggi), cercato su una griglia
  let piazza = { x: 500, y: 500 }, best = 1e18
  for (let gx = 0; gx <= 1000; gx += 10) for (let gy = 0; gy <= 1000; gy += 10) {
    let peggio = 0, somma = 0
    for (const s of insiemi) { const d = Math.max(0, Math.hypot(gx - s.casa.x, gy - s.casa.y) - s.raggio * 0.5); peggio = Math.max(peggio, d); somma += d }
    const v = peggio * 2 + somma / insiemi.length
    if (v < best) { best = v; piazza = { x: gx, y: gy } }
  }
  const punti: Punto[] = opere.map((w, i) => ({ id: w.id, x: +X[i].toFixed(1), y: +Y[i].toFixed(1), q: lab[i], giorno: w.day, titolo: w.title ?? '', peso: +(w.interest ?? 0.5).toFixed(2) }))
  return { punti, quartieri, insiemi, incroci: incroci.sort((a, b) => b.quanto - a.quanto), piazza, fili }
}

/** comunità sui fili (Louvain, due livelli): chi è legato più che per caso sta nello stesso quartiere */
function louvain(N: number, fili: [number, number, number][], r: () => number, gamma: number): number[] {
  const livello = (n: number, archi: [number, number, number][]) => {
    const adj: Map<number, number>[] = Array.from({ length: n }, () => new Map())
    const k = new Float64Array(n); let m2 = 0
    for (const [a, b, w] of archi) { if (a === b) { adj[a].set(a, (adj[a].get(a) ?? 0) + w); k[a] += 2 * w; m2 += 2 * w; continue } adj[a].set(b, (adj[a].get(b) ?? 0) + w); adj[b].set(a, (adj[b].get(a) ?? 0) + w); k[a] += w; k[b] += w; m2 += 2 * w }
    const com = Array.from({ length: n }, (_, i) => i), tot = Float64Array.from(k)
    for (let pass = 0; pass < 12; pass++) {
      let mossi = 0
      const ord = Array.from({ length: n }, (_, i) => i).sort(() => r() - 0.5)
      for (const i of ord) {
        const ci = com[i], verso = new Map<number, number>()
        for (const [j, w] of adj[i]) if (j !== i) verso.set(com[j], (verso.get(com[j]) ?? 0) + w)
        tot[ci] -= k[i]
        let best = ci, bg = (verso.get(ci) ?? 0) - gamma * tot[ci] * k[i] / m2
        for (const [c, w] of verso) { const g = w - gamma * tot[c] * k[i] / m2; if (g > bg) { bg = g; best = c } }
        tot[best] += k[i]; if (best !== ci) { com[i] = best; mossi++ }
      }
      if (!mossi) break
    }
    const id = new Map<number, number>(); return com.map(c => { if (!id.has(c)) id.set(c, id.size); return id.get(c)! })
  }
  let c1 = livello(N, fili)
  const n2 = Math.max(...c1) + 1, agg = new Map<string, number>()
  for (const [a, b, w] of fili) { const A = c1[a], B = c1[b], key = A < B ? `${A}|${B}` : `${B}|${A}`; agg.set(key, (agg.get(key) ?? 0) + w) }
  const c2 = livello(n2, [...agg].map(([k, w]) => { const [a, b] = k.split('|').map(Number); return [a, b, w] as [number, number, number] }))
  return c1.map(c => c2[c])
}
