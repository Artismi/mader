// L'interprete della sua parete. Lui scrive il programma a ogni giro, il sito lo esegue.
// Le regole sono le sue: un testo grande non va mai sopra uno piccolo, il testo ha sempre abbastanza contrasto,
// niente lampi. Si muove piano, e quando suona il brano respira insieme alla musica.
(function () {
  const P = window.PROGRAMMA
  if (!P) return
  const lento = matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── caso con seme: la stessa parete per lo stesso programma ──
  let s = P.seme >>> 0
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const perm = Array.from({ length: 512 }, (_, i) => i & 255)
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]] }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i]
  const fade = t => t * t * (3 - 2 * t)
  const h = (x, y) => perm[(perm[x & 255] + y) & 511] / 255
  function rumore0(x, y) { const X = Math.floor(x), Y = Math.floor(y), fx = fade(x - X), fy = fade(y - Y); const a = h(X, Y), b = h(X + 1, Y), c = h(X, Y + 1), d = h(X + 1, Y + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy }
  // il campo si sposta appena quando si esplora la lavagna (parallasse): come guardare lo sfondo da un treno
  const rumore = (x, y) => rumore0(x + ox * 0.002, y + oy * 0.002)
  const alfa = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }

  const fondo = P.ops.find(o => o.op === 'fondo')
  const campi = P.ops.filter(o => o.op === 'campo')
  const cv = document.getElementById('campo')
  const g = cv.getContext('2d')
  let W = 0, H = 0, dpr = 1, energia = 0, bersaglio = 0, t0 = performance.now(), ox = 0, oy = 0
  const stati = []

  function prepara() {
    dpr = Math.min(2, devicePixelRatio || 1)
    W = cv.clientWidth; H = cv.clientHeight
    cv.width = W * dpr; cv.height = H * dpr
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.fillStyle = fondo.bg; g.fillRect(0, 0, W, H)
    stati.length = 0
    for (const c of campi) {
      const n = Math.round(c.densita * (W * H) / 900 * (P.mini ? 0.5 : 1))
      if (c.tipo === 'flusso' || c.tipo === 'orbite') stati.push({ p: Array.from({ length: Math.min(n, 2400) }, () => ({ x: rnd() * W, y: rnd() * H, c: c.colori[Math.floor(rnd() * c.colori.length)], r: 20 + rnd() * Math.min(W, H) * 0.45, a: rnd() * 6.28, k: Math.floor(rnd() * 3) })) })
      else if (c.tipo === 'griglia') { const C = c.colonne, R = Math.max(3, Math.round(C * H / W)); stati.push({ C, R, v: Array.from({ length: C * R }, () => rnd() < 0.3 ? 1 : 0), m: new Float32Array(C * R), ultimo: 0 }) }
      else stati.push({})
    }
  }

  function disegna(ora) {
    const t = (ora - t0) / 1000
    energia += (bersaglio - energia) * 0.05 // la musica entra piano, non a scatti
    const pulisci = campi.some(c => c.tipo === 'onde' || c.tipo === 'griglia' || c.tipo === 'trama')
    g.fillStyle = pulisci ? fondo.bg : alfa(fondo.bg, 0.035 + fondo.grana * 0.02); g.fillRect(0, 0, W, H)
    campi.forEach((c, i) => {
      const S = stati[i], v = (1 / c.lentezza) * (1 + energia * 0.8), sc = c.scala / 100
      g.globalAlpha = c.peso
      if (c.tipo === 'flusso') {
        g.lineWidth = 0.8 + energia
        for (const p of S.p) {
          const a = rumore(p.x * sc, p.y * sc + t * 0.05 * v) * 6.28 * 2
          const nx = p.x + Math.cos(a) * v * 0.9, ny = p.y + Math.sin(a) * v * 0.9
          g.strokeStyle = alfa(p.c, 0.35); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(nx, ny); g.stroke()
          p.x = nx; p.y = ny
          if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || rnd() < 0.002) { p.x = rnd() * W; p.y = rnd() * H }
        }
      } else if (c.tipo === 'orbite') {
        const cx = [W * 0.3, W * 0.7, W * 0.5], cy = [H * 0.35, H * 0.6, H * 0.8]
        for (const p of S.p) {
          p.a += 0.002 * v * (60 / p.r)
          const x = cx[p.k] + Math.cos(p.a) * p.r * (1 + 0.15 * Math.sin(t * 0.3 + p.r)), y = cy[p.k] + Math.sin(p.a) * p.r * 0.6
          g.fillStyle = alfa(p.c, 0.6); g.beginPath(); g.arc(x, y, 1.3 + energia * 2, 0, 6.28); g.fill()
        }
      } else if (c.tipo === 'onde') {
        const K = Math.round(10 + c.densita * 30)
        for (let k = 0; k < K; k++) {
          const y0 = (k + 0.5) / K * H
          g.strokeStyle = alfa(c.colori[k % c.colori.length], 0.45); g.lineWidth = 1 + (k % 5 === 0 ? 1 : 0)
          g.beginPath()
          for (let x = 0; x <= W; x += 8) {
            const y = y0 + (rumore(x * sc, k * 0.3 + t * 0.04 * v) - 0.5) * H / K * (3 + energia * 3)
            x ? g.lineTo(x, y) : g.moveTo(x, y)
          }
          g.stroke()
        }
      } else if (c.tipo === 'griglia') {
        const cw = W / S.C, ch = H / S.R
        if (t - S.ultimo > 2.4 / (1 + energia)) { // un passo dell'automa: ogni cella guarda le vicine
          S.ultimo = t
          const n = S.v.slice()
          for (let r = 0; r < S.R; r++) for (let q = 0; q < S.C; q++) {
            let k = 0
            for (let dr = -1; dr <= 1; dr++) for (let dq = -1; dq <= 1; dq++) if (dr || dq) k += S.v[((r + dr + S.R) % S.R) * S.C + (q + dq + S.C) % S.C]
            const i = r * S.C + q
            n[i] = c.regola.nasce.includes(k) && !S.v[i] ? 1 : S.v[i] && c.regola.resta.includes(k) ? 1 : 0
          }
          if (n.every(x => !x) || n.join() === S.v.join()) for (let i = 0; i < n.length; i++) n[i] = rnd() < 0.25 ? 1 : 0
          S.v = n
        }
        for (let i = 0; i < S.v.length; i++) {
          S.m[i] += (S.v[i] - S.m[i]) * 0.04 // dissolvenza lenta, mai un lampo
          if (S.m[i] < 0.02) continue
          const q = i % S.C, r = Math.floor(i / S.C), m = S.m[i]
          g.fillStyle = alfa(c.colori[(q + r) % c.colori.length], 0.55 * m)
          const z = Math.min(cw, ch) * (0.2 + 0.6 * m)
          c.forma === 'punto' ? (g.beginPath(), g.arc(q * cw + cw / 2, r * ch + ch / 2, z / 2, 0, 6.28), g.fill()) : g.fillRect(q * cw + (cw - z) / 2, r * ch + (ch - z) / 2, z, z)
        }
      } else if (c.tipo === 'trama') {
        const passo = Math.max(36, Math.min(W, H) / (4 + c.densita * 10))
        g.font = `${passo * 0.8}px '${P.carattere}', serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
        for (let r = -1, y = 0; y < H + passo; r++, y += passo) for (let x = (r & 1) * passo / 2 - passo; x < W + passo; x += passo) {
          const a = (rumore(x * sc * 0.5, y * sc * 0.5 + t * 0.02 * v) - 0.5) * 3.14 * (1 + energia)
          g.save(); g.translate(x, y + (r & 1 ? 0 : 0)); g.rotate(a)
          g.fillStyle = alfa(c.colori[(r & 3) % c.colori.length], 0.3); g.fillText(c.segno, 0, 0); g.restore()
        }
      }
      g.globalAlpha = 1
    })
    if (!lento) requestAnimationFrame(disegna)
  }
  prepara(); addEventListener('resize', () => { prepara(); if (lento) disegna(performance.now()) })
  requestAnimationFrame(disegna)
  if (P.mini) return

  // ── il ritmo: il brano fa respirare il campo ──
  const btn = document.getElementById('ascolta'), au = document.getElementById('brano')
  if (btn && au) {
    let an, buf
    btn.onclick = () => {
      if (!an) { const ac = new AudioContext(), src = ac.createMediaElementSource(au); an = ac.createAnalyser(); an.fftSize = 512; src.connect(an); an.connect(ac.destination); buf = new Uint8Array(an.frequencyBinCount); (function ascolta() { an.getByteFrequencyData(buf); let e = 0; for (let i = 0; i < 24; i++) e += buf[i]; bersaglio = au.paused ? 0 : e / (24 * 255); requestAnimationFrame(ascolta) })() }
      if (au.paused) { au.play(); btn.textContent = '❚❚ ' + btn.dataset.titolo } else { au.pause(); btn.textContent = '▶ ' + btn.dataset.titolo }
    }
  }

  // ── la lavagna: si esplora trascinando, si avvicina e si allontana, si torna al centro ──
  const lav = document.getElementById('lavagna'), mondo = document.getElementById('mondo'), scala = document.getElementById('scala')
  if (!lav || !mondo) return
  const MW = mondo.offsetWidth, MH = mondo.offsetHeight
  let zoom = Math.min(1, Math.max(0.35, innerWidth / 1400))
  const applica = (z, px = lav.clientWidth / 2, py = lav.clientHeight / 2) => {
    // tiene fermo il punto sotto il cursore (o il centro dello schermo) mentre cambia la scala
    const wx = (lav.scrollLeft + px) / zoom, wy = (lav.scrollTop + py) / zoom
    zoom = Math.max(0.15, Math.min(1.6, z))
    mondo.style.transform = `scale(${zoom})`; scala.style.width = MW * zoom + 'px'; scala.style.height = MH * zoom + 'px'
    lav.scrollLeft = wx * zoom - px; lav.scrollTop = wy * zoom - py
  }
  const casa = (liscio) => { const cx = +mondo.dataset.cx * zoom, cy = +mondo.dataset.cy * zoom; lav.scrollTo({ left: cx - lav.clientWidth / 2, top: cy - lav.clientHeight / 2, behavior: liscio && !lento ? 'smooth' : 'auto' }) }
  applica(zoom); casa(false)
  document.getElementById('piu').onclick = () => applica(zoom * 1.25)
  document.getElementById('meno').onclick = () => applica(zoom / 1.25)
  document.getElementById('casa').onclick = () => casa(true)
  lav.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const b = lav.getBoundingClientRect(); applica(zoom * Math.exp(-e.deltaY * 0.0022), e.clientX - b.left, e.clientY - b.top) }, { passive: false })
  addEventListener('keydown', e => { if (e.key === '+' || e.key === '=') applica(zoom * 1.2); else if (e.key === '-') applica(zoom / 1.2); else if (e.key === '0') casa(true) })
  // trascinare col mouse (col dito si scorre già da sé)
  let giu = null
  lav.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; giu = { x: e.clientX, y: e.clientY, l: lav.scrollLeft, t: lav.scrollTop, mosso: false } })
  addEventListener('pointermove', e => { if (!giu) return; const dx = e.clientX - giu.x, dy = e.clientY - giu.y; if (!giu.mosso && Math.hypot(dx, dy) > 4) { giu.mosso = true; lav.classList.add('tira') } if (giu.mosso) { lav.scrollLeft = giu.l - dx; lav.scrollTop = giu.t - dy } })
  addEventListener('pointerup', () => { if (giu?.mosso) setTimeout(() => lav.classList.remove('tira'), 0); giu = null })
  lav.addEventListener('scroll', () => { ox = lav.scrollLeft / zoom; oy = lav.scrollTop / zoom }, { passive: true })
  // le isole entrano quando le si raggiunge; passandoci sopra si accendono i loro fili
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target) } }), { root: lav, threshold: 0.05 })
  const fili = [...document.querySelectorAll('.filo')]
  document.querySelectorAll('.isola').forEach(el => {
    io.observe(el)
    el.addEventListener('pointerenter', () => fili.forEach(f => f.classList.toggle('acceso', f.dataset.a === el.dataset.k || f.dataset.b === el.dataset.k)))
    el.addEventListener('pointerleave', () => fili.forEach(f => f.classList.remove('acceso')))
  })
  lav.focus({ preventScroll: true })
})()
