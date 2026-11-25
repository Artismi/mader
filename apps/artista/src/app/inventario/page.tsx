'use client'
/** Campionario: ogni strumento, motivo, generatore, ricetta e carattere, disegnato più volte. Solo per guardare. */
import { useEffect, useRef } from 'react'

type Voce = { gruppo: string; nome: string; cv?: HTMLCanvasElement; testo?: { fam: string; peso: number } }

export default function Inventario() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { (async () => {
    const out: Voce[] = []
    const W = 540, H = 675, th = (cv: HTMLCanvasElement) => { const c = document.createElement('canvas'); c.width = 180; c.height = 225; const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, 180, 225); const k = Math.min(180 / cv.width, 225 / cv.height); g.drawImage(cv, (180 - cv.width * k) / 2, (225 - cv.height * k) / 2, cv.width * k, cv.height * k); return c }
    if (new URLSearchParams(location.search).has('disegno')) {
      const Dg = await import('@/lib/studio-agent/hands/disegno'); const { rng } = await import('@/lib/studio-agent/core/rng'); const cose = await Dg.caricaCose(); const root = ref.current!
      const lista = ['albero', 'mano', 'pesce', 'casa', 'uccello', 'farfalla', 'teschio', 'fungo', 'cavallo', 'faro']
      const S = 240, pal = [['#1b1a17', '#efe9dd'], ['#7a1d12', '#f1e4d0'], ['#1c2b4a', '#e4e8ee'], ['#173d2c', '#e3ebde']]
      for (const [i, n] of lista.entries()) {
        const c = cose[n]; if (!c) continue
        const riga = document.createElement('div'); riga.style.cssText = 'display:flex;gap:3px;margin:3px;font:10px monospace;align-items:center'; root.appendChild(riga)
        const t = document.createElement('div'); t.textContent = n; t.style.width = '56px'; riga.appendChild(t)
        const box = (cv: HTMLCanvasElement, bg: string) => { const w = document.createElement('canvas'); w.width = 120; w.height = 120; const g = w.getContext('2d')!; g.fillStyle = bg; g.fillRect(0, 0, 120, 120); g.drawImage(cv, 0, 0, 120, 120); riga.appendChild(w) }
        for (const modo of ['schizzo', 'sagoma', 'volumi']) for (let v = 0; v < 3; v++) {
          const r = rng(i * 100 + v * 7 + modo.length), [ink, bg] = pal[(i + v) % 4], pz = Dg.immagina(c, r, 0.35 + v * 0.3)
          const cod = Dg.codifica(pz, 0.5 + v * 0.2)
          box(modo === 'schizzo' ? Dg.disegnaCodifica(cod, S, ink, 'linea', 0.018) : modo === 'sagoma' ? Dg.disegnaCodifica(cod, S, ink, 'pieno', 0.03) : Dg.disegnaCodifica(cod, S, ink, 'costruzione', 0.014, '#b0452a'), bg)
        }
      }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('forme')) {
      const F = await import('@/lib/studio-agent/hands/forma'); const forme = await F.caricaForme(); const root = ref.current!
      const cose = ['albero', 'mano', 'pesce', 'casa', 'uccello', 'farfalla', 'teschio', 'fungo', 'cavallo', 'faro']
      const S = 300
      for (const [i, c] of cose.entries()) {
        const f = F.formaDi(forme, c); if (!f) continue
        const riga = document.createElement('div'); riga.style.cssText = 'display:flex;gap:4px;margin:4px;font:11px monospace;align-items:center'; root.appendChild(riga)
        const t = document.createElement('div'); t.textContent = c; t.style.width = '70px'; riga.appendChild(t)
        const st = F.stampoDi(f, i % 3, S)
        const box = (cv: HTMLCanvasElement, bg = '#efe9dd') => { const w = document.createElement('canvas'); w.width = 150; w.height = 150; const g = w.getContext('2d')!; g.fillStyle = bg; g.fillRect(0, 0, 150, 150); g.drawImage(cv, 0, 0, 150, 150); riga.appendChild(w) }
        box(st.tratto)
        const m = document.createElement('canvas'); m.width = st.W; m.height = st.H; const mg = m.getContext('2d')!, id = mg.createImageData(st.W, st.H); for (let k = 0; k < st.W * st.H; k++) { id.data[k * 4 + 3] = st.dentro[k] ? 200 : 0 } mg.putImageData(id, 0, 0); box(m)
        const { stendiUniverso } = await import('@/lib/studio-agent/hands/universo'); const { cercaCamere } = await import('@/lib/studio-agent/hands/camera')
        const pal = [['#1c2b4a', '#e8dcc0'], ['#7a1d12', '#efe3cf'], ['#173d2c', '#dfe8d5'], ['#2a1f3d', '#f0d9c4']][i % 4]
        const ind = cercaCamere(String(i * 31 + 5), 3, 600)[0]?.indirizzo ?? String(i)
        const mat = stendiUniverso(S, S, { indirizzo: ind, colore: pal[0], caleido: ['sei', 'quattro', '', 'specchio'][i % 4], fino: 1, zoom: 0.5, rot: 0, alpha: 1 })
        box(F.scolpisci(st, mat, S, { colore: pal[1], luce: -2.3 }), '#d8d2c6')
        const cr = F.crescitaNelloStampo(st, i * 101 + 7, pal[0], S)
        box(F.scolpisci(st, cr, S, { colore: pal[1], luce: -2.0, lucido: 0.3 }), '#cfd6cf')
      }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('bottega')) {
      const { ricostruisci } = await import('@/lib/studio-agent/hands/cassetto'); const { TOOLS } = await import('@/lib/studio-agent/hands/tools'); const { flatten } = await import('@/lib/studio-agent/hands/sheet'); const { rng, weighted } = await import('@/lib/studio-agent/core/rng')
      const Q = await import('@/lib/studio-agent/mind/quaderno'); const { look } = await import('@/lib/studio-agent/mind/studio'); const { loadOrCreate } = await import('@/lib/studio-agent/day')
      const st = await loadOrCreate(); const r = rng(7)
      const ids: string[] = await (await fetch('/cassetto/indice.json')).json(); const root = ref.current!
      const tav = [] as Awaited<ReturnType<typeof ricostruisci>>[]; for (const id of ids.slice(0, 6)) tav.push(await ricostruisci(await (await fetch(`/cassetto/${id}.json`)).json()))
      const parole = ['tempo', 'città', 'memoria', 'frattura', 'territorio', 'acqua']
      const fine = performance.now() + 420000
      for (let i = 0; i < 400 && performance.now() < fine; i++) {
        const k = Math.floor(r() * tav.length), s0 = tav[k], w = parole[k]
        const c = { r, tone: { id: 'x', label: '', bg: s0.bg ?? '#ebe6dc', ink: '#121212', acc: '#e3361b', dark: false }, intention: { word: w, register: 'poetico', targets: {}, tools: [], why: '' }, mood: 'curioso', say: () => w, shaders: [], quality: 1 } as never
        const av = TOOLS.filter(t => { try { return t.available(s0, c) && (Q.quadernoDi(st).schede[t.id]?.costo ?? 0) < 25000 } catch { return false } })
        const t = weighted(r, av, x => 0.2 + (1 - Q.conoscenza(st, x.id)) ** 2, 1)
        const L0 = look(st, s0, (c as { intention: never }).intention); const sc = Q.scegli(st, t, s0, c, L0.f, r)
        const t0 = performance.now(); let s1
        try { s1 = await Q.applicaDove(t, s0, sc.p, c, sc.dove) } catch (e) { console.log('ERR', t.id, String(e).slice(0, 80)); continue }
        const ms = performance.now() - t0, L1 = look(st, s1, (c as { intention: never }).intention), vis = Q.visibile(s0, s1)
        Q.annota(st, t.id, { x: sc.x, w, vis, cambio: 0, delta: L1.score - L0.score, tenuto: L1.score >= L0.score, ms, quando: Date.now() }, ms)
        if (i < 96) { const box = document.createElement('div'); box.style.cssText = 'display:inline-block;margin:2px;font:9px monospace;width:96px;vertical-align:top'; const cv = flatten(s1, 0.13); cv.style.width = '96px'; box.appendChild(cv); box.appendChild(document.createTextNode(`${t.id} ${sc.dove.modo} ${(L1.score - L0.score).toFixed(2)} v${(vis * 100).toFixed(0)}`)); root.appendChild(box) }
      }
      for (const t of TOOLS) console.log('Q', Q.racconta(st, t.id), 'costo', Math.round(Q.quadernoDi(st).schede[t.id]?.costo ?? 0), 'regole', (Q.quadernoDi(st).schede[t.id]?.regole ?? []).map(g => g.k).join(','))
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('tutti')) {
      const { ricostruisci } = await import('@/lib/studio-agent/hands/cassetto'); const { TOOLS } = await import('@/lib/studio-agent/hands/tools'); const { flatten } = await import('@/lib/studio-agent/hands/sheet'); const { rng } = await import('@/lib/studio-agent/core/rng')
      const ids: string[] = await (await fetch('/cassetto/indice.json')).json(); const root = ref.current!
      const basi = [] as Awaited<ReturnType<typeof ricostruisci>>[]; for (const id of ids.slice(0, 2)) basi.push(await ricostruisci(await (await fetch(`/cassetto/${id}.json`)).json()))
      const riga0 = document.createElement('div'); riga0.style.cssText = 'display:inline-block;margin:3px;font:10px monospace;width:170px'; root.appendChild(riga0)
      for (const b of basi) { const cv = flatten(b, 0.15); cv.style.width = '80px'; riga0.appendChild(cv) } riga0.appendChild(document.createTextNode('ORIGINALI'))
      for (const t of TOOLS) {
        const box = document.createElement('div'); box.style.cssText = 'display:inline-block;margin:3px;font:10px monospace;width:170px;vertical-align:top'; root.appendChild(box)
        for (const [i, b] of basi.entries()) { const c = { r: rng(i * 11 + 3), tone: { id: 'x', label: '', bg: b.bg ?? '#ebe6dc', ink: '#121212', acc: ['#1630ff', '#e3361b'][i], dark: false }, intention: { word: 'tempo', register: 'poetico', targets: {}, tools: [], why: '' }, mood: 'calmo', say: () => 'tempo', shaders: [], quality: 1 } as never
          const t0 = performance.now(); let ok = 'ok'
          try { if (!t.available(b, c)) { ok = 'n/d'; const cv = flatten(b, 0.15); cv.style.cssText = 'width:80px;opacity:.25'; box.appendChild(cv) } else { const s1 = await Promise.race([t.apply(b, t.propose(b, c), c), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('lento')), 40000))]); const cv = flatten(s1, 0.15); cv.style.width = '80px'; box.appendChild(cv) } } catch (e) { ok = 'ERR ' + String(e).slice(0, 40); const d = document.createElement('div'); d.style.cssText = 'width:80px;height:100px;display:inline-block;background:#fcc'; box.appendChild(d) }
          box.dataset['t' + i] = `${ok} ${Math.round(performance.now() - t0)}ms` }
        box.appendChild(document.createTextNode(`${t.id} · ${box.dataset.t0} · ${box.dataset.t1}`)); console.log('TOOL', t.id, box.dataset.t0, box.dataset.t1)
      }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('raccolta')) {
      const { ricostruisci } = await import('@/lib/studio-agent/hands/cassetto'); const { raccolta, raccoltaACaso } = await import('@/lib/studio-agent/hands/raccolta'); const { flatten } = await import('@/lib/studio-agent/hands/sheet'); const { rng } = await import('@/lib/studio-agent/core/rng')
      const ids: string[] = await (await fetch('/cassetto/indice.json')).json(); const root = ref.current!
      const fot = async (id: string) => { const f = flatten(await ricostruisci(await (await fetch(`/cassetto/${id}.json`)).json()), 1); const c = document.createElement('canvas'); c.width = 540; c.height = 960; const g = c.getContext('2d')!; g.fillStyle = '#111'; g.fillRect(0, 0, 540, 960); const h = 540 * f.height / f.width; g.drawImage(f, 0, (960 - h) / 2, 540, h); return c }
      for (const [k, [a, b]] of [[0, 1], [2, 3], [4, 5]].entries()) {
        const A = await fot(ids[a % ids.length]), B = await fot(ids[b % ids.length]); const o = raccoltaACaso(rng(k * 17 + 3)); o.passo = 2; o.quota = 1
        const fin = raccolta([{ tav: 0, t0: 0, t1: 2 }, { tav: 1, t0: 2, t1: 4 }], { beat: 0.5 } as never, o)
        const riga = document.createElement('div'); riga.style.cssText = 'display:flex;gap:3px;margin:4px;font:10px monospace'; riga.textContent = `${o.viaggio} ${o.resa} scia ${o.scia.toFixed(1)} orbita ${o.orbita.toFixed(1)}`; root.appendChild(riga)
        for (const t of [1.25, 1.55, 1.8, 1.95, 2.1, 2.35, 2.6, 2.8]) { const src = t < 2 ? A : B; const c = document.createElement('canvas'); c.width = 540; c.height = 960; c.getContext('2d')!.drawImage(src, 0, 0); const out = fin(c, t) ?? c; const v = document.createElement('canvas'); v.width = 180; v.height = 320; v.getContext('2d')!.drawImage(out, 0, 0, 180, 320); riga.appendChild(v) }
      }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('segnali')) {
      const { ricostruisci } = await import('@/lib/studio-agent/hands/cassetto'); const T = await import('@/lib/studio-agent/hands/segnali'); const { flatten } = await import('@/lib/studio-agent/hands/sheet'); const { rng } = await import('@/lib/studio-agent/core/rng')
      const ids: string[] = (await (await fetch('/cassetto/indice.json')).json()).slice(0, 3); const root = ref.current!
      for (const t of [T.ondineTool, T.mosaicoTool, T.colataTool, T.ditherTool, T.memoriaTool]) for (const [i, id] of ids.entries()) { const s0 = await ricostruisci(await (await fetch(`/cassetto/${id}.json`)).json()); const c = { r: rng(i * 13 + 5), tone: { bg: '#ebe6dc', ink: '#121212', acc: ['#1630ff', '#e3361b', '#d4ff2a'][i % 3] } } as never; const s1 = await t.apply(s0, t.propose(s0, c), c); const cv = flatten(s1, 0.3); cv.style.width = '160px'; cv.style.margin = '2px'; cv.title = t.id; root.appendChild(cv) }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('fette')) {
      const { ricostruisci } = await import('@/lib/studio-agent/hands/cassetto'); const { affettatoreTool } = await import('@/lib/studio-agent/hands/affettatore'); const { flatten } = await import('@/lib/studio-agent/hands/sheet'); const { rng } = await import('@/lib/studio-agent/core/rng')
      const ids: string[] = await (await fetch('/cassetto/indice.json')).json(); const root = ref.current!
      for (const [i, id] of ids.entries()) { const s0 = await ricostruisci(await (await fetch(`/cassetto/${id}.json`)).json()); for (const k of [0, 1]) { const c = { r: rng(i * 31 + k * 7 + 2), tone: { bg: '#ebe6dc', ink: '#121212', acc: ['#16c25a', '#e3361b', '#1630ff', '#d4ff2a'][(i + k) % 4] } } as never; const p = affettatoreTool.propose(s0, c); const s1 = await affettatoreTool.apply(s0, p, c); const cv = flatten(s1, 0.45); const dv = document.createElement('div'); dv.style.cssText = 'width:240px;margin:3px;font:10px monospace'; cv.style.width = '240px'; dv.appendChild(cv); const l = document.createElement('div'); l.textContent = `${(p as { colonne: number }).colonne}x${(p as { righe: number }).righe} ${(p as { retino: string }).retino}`; dv.appendChild(l); root.appendChild(dv) } }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('vetri')) {
      const { ricostruisci } = await import('@/lib/studio-agent/hands/cassetto'); const { vetroTool } = await import('@/lib/studio-agent/hands/vetro'); const { flatten } = await import('@/lib/studio-agent/hands/sheet')
      const ids: string[] = await (await fetch('/cassetto/indice.json')).json(); const root = ref.current!
      const prove: [string, number, number][] = [['vetrata', 0.06, 1.0], ['verticale', 0.05, 1.2], ['martellato', 0.08, 0.9], ['tasselli', 0.04, 1.1], ['croce', 0.06, 1.3], ['vetrata', 0.05, 1.0]]
      for (const [i, id] of ids.entries()) { const s0 = await ricostruisci(await (await fetch(`/cassetto/${id}.json`)).json()); for (const k of [0, 1]) { const [d, cn, cu] = prove[(i * 2 + k) % 6]; const s1 = await vetroTool.apply(s0, { disegno: d, canna: cn, curva: cu, ombra: 0.35, seme: i * 5 + k, aria: 0.4 + k * 0.5, indice: 0.7, sabbia: k ? 0.6 : 0.2, tinta: 0.25, bolle: k ? 0.5 : 0.15, luce: -2.2 + i * 0.5, lucido: 0.6, colori: ['#c8d6d2', '#e9d8a6', '#9fb8c9', '#d9a7a0'], layer: '' }, {} as never); const cv = flatten(s1, 0.45); const dv = document.createElement('div'); dv.style.cssText = 'width:240px;margin:3px;font:11px monospace'; cv.style.width = '240px'; dv.appendChild(cv); const l = document.createElement('div'); l.textContent = d; dv.appendChild(l); root.appendChild(dv) } }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('vere')) {
      const { ricostruisci } = await import('@/lib/studio-agent/hands/cassetto')
      const { luceDiScena } = await import('@/lib/studio-agent/hands/luce3d')
      const { vetro } = await import('@/lib/studio-agent/hands/vetro')
      const { flatten } = await import('@/lib/studio-agent/hands/sheet')
      const ids: string[] = await (await fetch('/cassetto/indice.json')).json()
      const root = ref.current!
      const metti = (cv: HTMLCanvasElement, nome: string) => { const d = document.createElement('div'); d.style.cssText = 'width:200px;margin:3px;font:11px monospace'; cv.style.width = '200px'; d.appendChild(cv); const l = document.createElement('div'); l.textContent = nome; d.appendChild(l); root.appendChild(d) }
      const disegni = ['verticale', 'croce', 'fasce', 'orizzontale', 'riquadri', 'diagonale'] as const
      for (const [i, id] of ids.entries()) {
        try {
          const s0 = await ricostruisci(await (await fetch(`/cassetto/${id}.json`)).json())
          const piatta = flatten(s0, 0.4)
          metti(piatta, `${i} piatta`)
          if (false) metti(flatten(luceDiScena(s0, { angolo: -2.3, quota: 0.022, morbidezza: 0.012, rilievo: 0.8, nebbia: 0.2 }), 0.4), `${i} luce di scena`)
          if (false) metti(vetro(piatta, { disegno: disegni[i % 6], canna: 0.06, curva: 1.1, ombra: 0.3, seme: i * 7 + 1 }), `${i} vetro ${disegni[i % 6]}`)
          let a0 = i * 99 + 3; const rr = () => ((a0 = (a0 * 1664525 + 1013904223) >>> 0) / 4294967296)
          const { stira, tasselli } = await import('@/lib/studio-agent/hands/stiro')
          const { particelle, sciame } = await import('@/lib/studio-agent/hands/sciame')
          const fig = s0.layers.filter(l => l.scale < 0.99 && !/testo|tipografia|etichette|firma/.test(l.kind)).sort((x, y) => y.scale - x.scale)[0]
          if (fig) {
            const sp = { ...s0, layers: s0.layers.map(l => l === fig ? { ...l, canvas: particelle(l.canvas, i + 1, 4, 0.6), blend: 'screen' as const } : l), bg: '#0b0b0c' }
            metti(flatten(sp, 0.4), `${i} particelle`)
            const sc = { ...s0, layers: s0.layers.map(l => l === fig ? { ...l, canvas: sciame(l.canvas, i + 1, 9, 0.6) } : l) }
            metti(flatten(sc, 0.4), `${i} sciame`)
          }
        } catch (e) { metti(document.createElement('canvas'), `${i} ERR ${String(e).slice(0, 40)}`) }
      }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('vetro')) {
      const { vetro } = await import('@/lib/studio-agent/hands/vetro')
      const root = ref.current!, tav = ['/img/a.jpg', '/img/b.jpg', '/img/c.jpg', '/img/d.jpg']
      const prove: [string, string, number, number][] = [['verticale', tav[0], 0.03, 0.9], ['orizzontale', tav[1], 0.02, 0.7], ['diagonale', tav[2], 0.025, 0.8], ['tasselli', tav[3], 0.04, 1.0], ['croce', tav[1], 0.025, 0.9], ['fasce', tav[0], 0.02, 0.8], ['riquadri', tav[2], 0.03, 0.9], ['verticale', tav[3], 0.012, 1.2]]
      for (const [d, t, cn, cu] of prove) { const im = new Image(); im.src = t; await im.decode(); const b = document.createElement('canvas'); b.width = 432; b.height = 540; b.getContext('2d')!.drawImage(im, 0, 0, 432, 540); const v = vetro(b, { disegno: d as never, canna: cn, curva: cu, ombra: 0.3, seme: 7 }); const dv = document.createElement('div'); dv.style.cssText = 'width:216px;margin:4px;font:11px monospace'; v.style.width = '216px'; dv.appendChild(v); const l = document.createElement('div'); l.textContent = d; dv.appendChild(l); root.appendChild(dv) }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('luce')) {
      const { luceDiScena } = await import('@/lib/studio-agent/hands/luce3d')
      const { TOOLS } = await import('@/lib/studio-agent/hands/tools'); const { emptySheet, flatten } = await import('@/lib/studio-agent/hands/sheet'); const { rng } = await import('@/lib/studio-agent/core/rng')
      const { TONES } = await import('@/components/studio/genera/recipes')
      const root = ref.current!
      for (const k of [1, 2, 3, 4, 5, 6]) {
        const tone = TONES[k % TONES.length], c = { r: rng(k * 71), tone, intention: { word: 'linea', register: 'neutro', targets: {}, why: '' }, mood: 'curioso', say: () => 'la linea tiene il posto', shaders: [], quality: 0.5, noText: false, tipoOk: true } as never
        let s0 = emptySheet(540, 675, (tone as { bg: string }).bg)
        for (const id of ['semina', 'geometria', 'cristallo', 'scrivi']) { const t = TOOLS.find(x => x.id === id)!; try { if (t.available(s0, c)) s0 = await t.apply(s0, t.propose(s0, c), c) } catch { /* */ } }
        const s1 = luceDiScena(s0, { angolo: -2.2, quota: 0.016, morbidezza: 0.01, rilievo: 0.8, nebbia: 0.2 })
        for (const [nome, sh] of [['piatta', s0], ['luce di scena', s1]] as const) { const d = document.createElement('div'); d.style.cssText = 'width:270px;margin:4px;font:11px monospace'; const cv = flatten(sh, 0.5); cv.style.width = '270px'; d.appendChild(cv); const l = document.createElement('div'); l.textContent = `${k} ${nome}`; d.appendChild(l); root.appendChild(d) }
      }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    if (new URLSearchParams(location.search).has('filtri')) {
      const { FILTRI, filtra } = await import('@/lib/studio-agent/hands/filtri')
      const im = new Image(); im.src = '/img/b.jpg'; await im.decode(); const b = document.createElement('canvas'); b.width = 432; b.height = 540; b.getContext('2d')!.drawImage(im, 0, 0, 432, 540)
      out.push({ gruppo: 'Filtri', nome: 'originale', cv: th(b) })
      for (const n of FILTRI) { try { const r0 = filtra(b, n, {}); out.push({ gruppo: 'Filtri', nome: n, cv: r0 ? th(r0) : undefined }) } catch (e) { out.push({ gruppo: 'Filtri', nome: `${n} ERR ${String(e).slice(0, 50)}` }) } }
      const root = ref.current!; for (const v of out) { const d = document.createElement('div'); d.style.cssText = 'width:180px;margin:4px;font:11px monospace'; if (v.cv) d.appendChild(v.cv); const l = document.createElement('div'); l.textContent = v.nome; d.appendChild(l); root.appendChild(d) }
      ;(window as unknown as { __fatto: boolean }).__fatto = true; return
    }
    const { TOOLS } = await import('@/lib/studio-agent/hands/tools')
    const { emptySheet, flatten } = await import('@/lib/studio-agent/hands/sheet')
    const { rng } = await import('@/lib/studio-agent/core/rng')
    const { TONES, RECIPES, runRecipe } = await import('@/components/studio/genera/recipes')
    const { FACES, loadLabFonts } = await import('@/components/studio/genera/fonts')
    const { disegnaCristallo, cercaCristalli } = await import('@/lib/studio-agent/hands/cristallo')
    const { disegnaCamera, cercaCamere } = await import('@/lib/studio-agent/hands/camera')
    const { disegnaMuffa } = await import('@/lib/studio-agent/hands/muffa')
    const { segnoDi } = await import('@/lib/studio-agent/mind/atlante')
    await loadLabFonts()
    const st = await (await fetch('/inventario-stato.json')).json()
    const carta = TONES.find(t => t.id === 'carta') ?? TONES[0], notte = TONES.find(t => t.id === 'notte') ?? TONES[0]
    const ctx = (seed: number, tone = carta) => ({ r: rng(seed), tone, intention: { word: 'linea', register: 'neutro', targets: {}, why: '' }, mood: 'curioso', say: () => 'la linea tiene il posto', shaders: st.shaders ?? [], quality: 0.5, noText: false, tipoOk: true } as never)
    const { disegnaAlbero, NATURE } = await import('@/lib/studio-agent/hands/albero')
    for (const n of NATURE) for (const k of [1, 2, 3]) out.push({ gruppo: 'Crescite (nuovo)', nome: `${n} ${k}`, cv: th(disegnaAlbero(k * 4049 + n.length, k === 2 ? '#e3361b' : '#121212', 700, n)) })
    for (const [id, f] of Object.entries(FACES)) out.push({ gruppo: 'Caratteri', nome: id, testo: { fam: (f as { family: string }).family, peso: (f as { weight: number }).weight, it: !!(f as { italic?: boolean }).italic } as never })
    const SOLO = new URLSearchParams(location.search).has('breve')
    if (SOLO) {
      const { acquaSu } = await import('@/lib/studio-agent/hands/acqua')
      const tav = ['/img/a.jpg', '/img/b.jpg', '/img/c.jpg', '/img/d.jpg', '/img/e.jpg']
      const modi = ['goccioloni', 'gocce', 'rugiada', 'brina', 'gelo'] as const
      for (let i = 0; i < 5; i++) { try { const im = new Image(); im.src = tav[i]; await im.decode(); const b = document.createElement('canvas'); b.width = 540; b.height = 675; b.getContext('2d')!.drawImage(im, 0, 0, 540, 675); const w = acquaSu(b, modi[i], i * 991 + 7); b.getContext('2d')!.drawImage(w, 0, 0); const big = document.createElement('canvas'); big.width = 360; big.height = 450; big.getContext('2d')!.drawImage(b, 0, 0, 360, 450); out.push({ gruppo: 'Acqua (nuovo)', nome: modi[i], cv: big }) } catch (e) { out.push({ gruppo: 'Acqua (nuovo)', nome: `${modi[i]} ERR ${String(e).slice(0, 40)}` }) } }
      const { shuffle, defaults } = await import('@/components/studio/genera/recipes')
      for (const id of ['goccia', 'macchia']) { const rc = RECIPES.find(x => x.id === id)!; for (const k of [1, 2, 3, 4, 5, 6]) { try { out.push({ gruppo: 'Fumo e macchia (variati)', nome: `${id} ${k}`, cv: th(runRecipe(rc, shuffle(rc, defaults(rc), k * 313), k * 313, '4:5', 0.3) as unknown as HTMLCanvasElement) }) } catch (e) { out.push({ gruppo: 'Fumo e macchia (variati)', nome: `${id} ERR ${String(e).slice(0, 30)}` }) } } }
      for (const k of [1, 2, 3, 4, 5, 6]) out.push({ gruppo: 'Muffa (giunture nuove)', nome: `seme ${k}`, cv: th(disegnaMuffa(k * 7919, '#121212', 600)) })
    }
    if (!SOLO) {
    // 1. strumenti: ognuno su un foglio vuoto e su uno già seminato, con semi diversi
    for (const t of TOOLS) for (const k of [1, 2, 3]) {
      try {
        const c = ctx(k * 977 + t.id.length, k === 3 ? notte : carta) as { r: () => number; tone: typeof carta }
        let s = emptySheet(W, H, c.tone.bg)
        if (k > 1) { const sem = TOOLS.find(x => x.id === 'semina'); if (sem) s = await sem.apply(s, sem.propose(s, c as never), c as never) }
        if (!t.available(s, c as never)) { out.push({ gruppo: 'Strumenti', nome: `${t.id} (non disponibile qui)` }); continue }
        s = await t.apply(s, t.propose(s, c as never), c as never)
        out.push({ gruppo: 'Strumenti', nome: `${t.id} · ${t.label}`, cv: th(flatten(s, 0.5)) })
      } catch (e) { out.push({ gruppo: 'Strumenti', nome: `${t.id} ERRORE ${String(e).slice(0, 40)}` }) }
    }
    // 2. i motivi veri dell'atlante (i concetti con il loro segno)
    const concetti = Object.keys(st.atlante?.concetti ?? {}).slice(0, 60)
    for (const w of concetti) { try { out.push({ gruppo: 'Motivi dell\'atlante', nome: `${w} · ${st.atlante.concetti[w]?.motivo?.forma ?? '?'}`, cv: th(await segnoDi(st, rng(w.length * 31), w, carta, ctx(7))) }) } catch (e) { out.push({ gruppo: 'Motivi dell\'atlante', nome: `${w} ERRORE` }) } }
    // 3. i mondi
    for (const x of cercaCristalli('inventario', 8, 4000)) out.push({ gruppo: 'Cristallo', nome: x.famiglia, cv: th(disegnaCristallo(x.indirizzo, { S: 600, colore: '#121212', fondo: '#ebe6dc' } as never)) })
    for (const x of cercaCamere('inventario', 8, 4000)) out.push({ gruppo: 'Camera', nome: x.indirizzo.slice(0, 18), cv: th(disegnaCamera(x.indirizzo, { S: 600, colore: '#121212', fondo: '#ebe6dc' } as never)) })
    for (const k of [1, 2, 3, 4, 5, 6]) out.push({ gruppo: 'Muffa', nome: `seme ${k}`, cv: th(disegnaMuffa(k * 7919, '#121212', 600)) })
    // 4. ricette (texture e generatori del software)
    for (const rc of RECIPES) { try { const cv = runRecipe(rc, {}, 4242, '4:5', 0.3) as unknown as HTMLCanvasElement; out.push({ gruppo: 'Ricette', nome: `${rc.cat} · ${rc.id}`, cv: th(cv) }) } catch (e) { out.push({ gruppo: 'Ricette', nome: `${rc.id} ERRORE` }) } }
    }
    // 2b. i motivi anche in breve
    if (SOLO) for (const w of Object.keys(st.atlante?.concetti ?? {}).slice(0, 40)) { try { out.push({ gruppo: 'Motivi dell\'atlante', nome: w, cv: th(await segnoDi(st, rng(w.length * 31), w, carta, ctx(7))) }) } catch { /* */ } }
    if (SOLO) for (const k of [1, 2, 3, 4, 5, 6, 7, 8]) { const sem = TOOLS.find(x => x.id === 'semina')!; const c = ctx(k * 131) as never; let s0 = emptySheet(W, H, carta.bg); s0 = await sem.apply(s0, sem.propose(s0, c), c); out.push({ gruppo: 'Semina', nome: `semina ${k}`, cv: th(flatten(s0, 0.5)) }) }
    // disegno
    const root = ref.current!; let g0 = ''
    for (const v of out) {
      if (v.gruppo !== g0) { g0 = v.gruppo; const h = document.createElement('h2'); h.textContent = g0; h.style.cssText = 'width:100%;font:600 22px sans-serif;margin:24px 0 8px'; root.appendChild(h) }
      const d = document.createElement('div'); d.style.cssText = `width:${v.cv && v.cv.width > 200 ? 360 : 180}px;margin:4px;font:11px monospace;color:#222`
      if (v.cv) d.appendChild(v.cv)
      else if (v.testo) { const p = document.createElement('div'); p.style.cssText = `width:180px;height:225px;background:#fff;font-family:'${v.testo.fam}';font-weight:${v.testo.peso};font-style:${(v.testo as { it?: boolean }).it ? 'italic' : 'normal'};font-size:30px;line-height:1.05;overflow:hidden;padding:8px;box-sizing:border-box`; p.textContent = 'Il concetto costituisce la rivoluzione 0123'; d.appendChild(p) }
      else { const p = document.createElement('div'); p.style.cssText = 'width:180px;height:225px;background:#fdd'; d.appendChild(p) }
      const l = document.createElement('div'); l.textContent = v.nome; d.appendChild(l); root.appendChild(d)
    }
    ;(window as unknown as { __fatto: boolean }).__fatto = true
  })() }, [])
  return <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', background: '#ddd', padding: 12, width: 1600 }} />
}
