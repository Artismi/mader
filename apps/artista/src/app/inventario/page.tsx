'use client'
/** Campionario: ogni strumento, motivo, generatore, ricetta e carattere, disegnato più volte. Solo per guardare. */
import { useEffect, useRef } from 'react'

type Voce = { gruppo: string; nome: string; cv?: HTMLCanvasElement; testo?: { fam: string; peso: number } }

export default function Inventario() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { (async () => {
    const out: Voce[] = []
    const W = 540, H = 675, th = (cv: HTMLCanvasElement) => { const c = document.createElement('canvas'); c.width = 180; c.height = 225; const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, 180, 225); const k = Math.min(180 / cv.width, 225 / cv.height); g.drawImage(cv, (180 - cv.width * k) / 2, (225 - cv.height * k) / 2, cv.width * k, cv.height * k); return c }
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
