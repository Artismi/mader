/**
 * Il meta-generatore di shader: un generatore di generatori, senza nessuna IA. Uno shader è un albero di nodi
 * (sorgenti che danno un campo 0..1, operatori che li combinano, modificatori che piegano lo spazio, il colore in OKLab,
 * il dither di Bayer) costruito da una grammatica con pesi e un seme; dall'albero si scrive GLSL che compila sempre.
 * Nuovi generatori nascono per mutazione (cambia un numero, sostituisci un ramo, piega lo spazio) e incrocio di due alberi;
 * si tengono quelli che, resi davvero, hanno varietà, struttura e novità, a parità di costo (frontiera tra bellezza
 * misurata e numero di nodi). Gli alberi si salvano: si possono riaprire, mutare, combinare. Le misure sono quelle
 * che Copibolo usa già per guardare le tavole (contrasto, bordi, entropia, vuoto).
 */
type Rnd = () => number
export type Nodo =
  | { k: 'onde'; f: number; ang: number } | { k: 'rumore'; s: number; o: number } | { k: 'celle'; s: number } | { k: 'anelli'; f: number }
  | { k: 'griglia'; f: number; w: number } | { k: 'retino'; f: number; ang: number } | { k: 'gabor'; f: number; ang: number; n: number } | { k: 'bordi'; s: number; w: number }
  | { k: 'somma' | 'prodotto' | 'max' | 'min'; a: Nodo; b: Nodo } | { k: 'liscio'; a: Nodo; b: Nodo; r: number } | { k: 'miscela'; a: Nodo; b: Nodo; m: Nodo }
  | { k: 'soglia'; a: Nodo; t: number; w: number } | { k: 'piega'; a: Nodo }
  | { k: 'spazio'; m: 'ruota' | 'scala' | 'ripeti' | 'simmetria' | 'torci' | 'disturba' | 'polare'; v: number; a: Nodo }
export type Albero = { radice: Nodo; dither: number; tinte: number }

const SORGENTI = ['onde', 'rumore', 'celle', 'anelli', 'griglia', 'retino', 'gabor', 'bordi'] as const
const OPERATORI = ['somma', 'prodotto', 'max', 'min', 'liscio', 'miscela', 'soglia', 'piega'] as const
const MODI = ['ruota', 'scala', 'ripeti', 'simmetria', 'torci', 'disturba', 'polare'] as const
const pk = <T,>(r: Rnd, l: readonly T[], pesi?: number[]) => { if (!pesi) return l[Math.floor(r() * l.length)]; let x = r() * pesi.reduce((a, b) => a + b, 0); for (let i = 0; i < l.length; i++) if ((x -= pesi[i]) <= 0) return l[i]; return l[0] }
const n2 = (x: number) => +x.toFixed(3)

/** la grammatica: espande dalla radice; i pesi delle sorgenti si possono spingere (il carattere di un'area, i motivi delle sue tavole) */
export function genera(r: Rnd, spinte: Partial<Record<typeof SORGENTI[number], number>> = {}, prof = 0): Nodo {
  const foglia = prof >= 3 || r() < 0.25 + prof * 0.18
  if (foglia) {
    const k = pk(r, SORGENTI, SORGENTI.map(s => 1 + (spinte[s] ?? 0) * 3))
    switch (k) {
      case 'onde': return { k, f: n2(4 + r() * 40), ang: n2(r() * 3.14) }
      case 'rumore': return { k, s: n2(2 + r() * 10), o: 1 + Math.floor(r() * 4) }
      case 'celle': return { k, s: n2(3 + r() * 14) }
      case 'anelli': return { k, f: n2(4 + r() * 30) }
      case 'griglia': return { k, f: n2(4 + r() * 30), w: n2(0.03 + r() * 0.2) }
      case 'retino': return { k, f: n2(20 + r() * 80), ang: n2(r() * 1.57) }
      case 'bordi': return { k, s: n2(3 + r() * 12), w: n2(0.02 + r() * 0.12) }
      default: return { k: 'gabor', f: n2(6 + r() * 30), ang: n2(r() * 3.14), n: 2 + Math.floor(r() * 5) }
    }
  }
  if (r() < 0.3) return { k: 'spazio', m: pk(r, MODI), v: n2(0.2 + r() * 2.5), a: genera(r, spinte, prof + 1) }
  const k = pk(r, OPERATORI, [2, 2, 1.5, 1.5, 1.5, 1, 1.5, 0.8])
  if (k === 'soglia') return { k, a: genera(r, spinte, prof + 1), t: n2(0.3 + r() * 0.4), w: n2(0.01 + r() * 0.2) }
  if (k === 'piega') return { k, a: genera(r, spinte, prof + 1) }
  if (k === 'miscela') return { k, a: genera(r, spinte, prof + 1), b: genera(r, spinte, prof + 1), m: genera(r, spinte, prof + 2) }
  if (k === 'liscio') return { k, a: genera(r, spinte, prof + 1), b: genera(r, spinte, prof + 1), r: n2(0.05 + r() * 0.3) }
  return { k, a: genera(r, spinte, prof + 1), b: genera(r, spinte, prof + 1) }
}

export const conta = (n: Nodo): number => 1 + (['a', 'b', 'm'] as const).reduce((s, x) => s + (typeof (n as unknown as Record<string, unknown>)[x] === 'object' ? conta((n as unknown as Record<string, Nodo>)[x]) : 0), 0)
const figli = (n: Nodo) => (['a', 'b', 'm'] as const).filter(x => typeof (n as unknown as Record<string, unknown>)[x] === 'object')
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x))
function nodi(n: Nodo, out: Nodo[] = []): Nodo[] { out.push(n); for (const x of figli(n)) nodi((n as unknown as Record<string, Nodo>)[x], out); return out }

/** mutazione: un numero, un ramo nuovo, una piega dello spazio, o un ramo tolto */
export function muta(r: Rnd, A: Albero): Albero {
  const B = copia(A), tutti = nodi(B.radice), n = tutti[Math.floor(r() * tutti.length)] as unknown as Record<string, unknown>, x = r()
  if (x < 0.45) { const ks = Object.keys(n).filter(k => typeof n[k] === 'number'); if (ks.length) { const k = ks[Math.floor(r() * ks.length)]; n[k] = Number.isInteger(n[k]) ? Math.max(1, (n[k] as number) + (r() < 0.5 ? -1 : 1)) : n2((n[k] as number) * (0.6 + r() * 0.8)) } }
  else if (x < 0.7) { const f = figli(n as Nodo); if (f.length) n[f[Math.floor(r() * f.length)]] = genera(r, {}, 2) }
  else if (x < 0.85) { const f = figli(n as Nodo); if (f.length) { const c = f[Math.floor(r() * f.length)]; n[c] = { k: 'spazio', m: pk(r, MODI), v: n2(0.2 + r() * 2.5), a: n[c] } } }
  else if (x < 0.95) { const f = figli(n as Nodo); if (f.length) { const c = f[Math.floor(r() * f.length)], sub = n[c] as Nodo, ff = figli(sub); if (ff.length) n[c] = (sub as unknown as Record<string, Nodo>)[ff[0]] } }
  else { B.dither = r() < 0.5 ? 0 : 2 + Math.floor(r() * 3); B.tinte = 2 + Math.floor(r() * 3) }
  return B
}
/** incrocio a un punto: un ramo del secondo innestato nel primo */
export function incrocia(r: Rnd, A: Albero, B: Albero): Albero {
  const C = copia(A), na = nodi(C.radice).filter(n => figli(n).length), nb = nodi(copia(B.radice))
  if (!na.length) return C
  const n = na[Math.floor(r() * na.length)] as unknown as Record<string, unknown>, f = figli(n as Nodo); n[f[Math.floor(r() * f.length)]] = nb[Math.floor(r() * nb.length)]
  return C
}

// ── scrivere il GLSL ──────────────────────────────────────────────────────────────────────────────────────
const BASE = `float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + u_seed) * 43758.5453); }
vec2 h2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))) + u_seed) * 43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h1(i),h1(i+vec2(1,0)),f.x), mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x), f.y); }
mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); } vec3 gam(vec3 c){ return pow(max(c,0.), vec3(1./2.2)); }
vec3 oklab(vec3 c){ c=lin(c); float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b, m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b, s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b; l=pow(l,1./3.); m=pow(m,1./3.); s=pow(s,1./3.); return vec3(.2104542553*l+.7936177850*m-.0040720468*s, 1.9779984951*l-2.4285922050*m+.4505937099*s, .0259040371*l+.7827717662*m-.8086757660*s); }
vec3 dalab(vec3 c){ float l=c.x+.3963377774*c.y+.2158037573*c.z, m=c.x-.1055613458*c.y-.0638541728*c.z, s=c.x-.0894841775*c.y-1.2914855480*c.z; l=l*l*l; m=m*m*m; s=s*s*s; return gam(vec3(4.0767416621*l-3.3077115913*m+.2309699292*s, -1.2684380046*l+2.6097574011*m-.3413193965*s, -.0041960863*l-.7034186147*m+1.7076147010*s)); }
float bayer4(vec2 q){ vec2 i=mod(floor(q),4.); float b=0.; int x=int(i.x), y=int(i.y);
  if(y==0){ b = x==0?0.:x==1?8.:x==2?2.:10.; } else if(y==1){ b = x==0?12.:x==1?4.:x==2?14.:6.; } else if(y==2){ b = x==0?3.:x==1?11.:x==2?1.:9.; } else { b = x==0?15.:x==1?7.:x==2?13.:5.; } return (b+.5)/16.; }
`
const vec = (h: string) => { const v = parseInt(h.replace('#', ''), 16); return `vec3(${((v >> 16 & 255) / 255).toFixed(3)},${((v >> 8 & 255) / 255).toFixed(3)},${((v & 255) / 255).toFixed(3)})` }

/** semplifica l'albero senza cambiarne l'immagine (o quasi): piega di piega, soglie in fila, spazi identici, rami uguali */
export function semplifica(n: Nodo): Nodo {
  const m = n as unknown as Record<string, unknown>
  for (const x of ['a', 'b', 'm']) if (typeof m[x] === 'object') m[x] = semplifica(m[x] as Nodo)
  if (n.k === 'piega' && n.a.k === 'piega') return n.a.a // |2|2x-1|-1| ripiegato due volte: si tiene una piega
  if (n.k === 'soglia' && n.a.k === 'soglia') return { ...n, a: n.a.a, w: Math.min(n.w, n.a.w) }
  if (n.k === 'spazio' && n.m === 'scala' && Math.abs(n.v - 1) < 0.05) return n.a
  if ((n.k === 'max' || n.k === 'min' || n.k === 'liscio') && JSON.stringify(n.a) === JSON.stringify(n.b)) return n.a
  if (n.k === 'miscela' && JSON.stringify(n.a) === JSON.stringify(n.b)) return n.a
  return n
}

export function inGLSL(A: Albero, colori: [string, string, string]): string {
  A = { ...A, radice: semplifica(JSON.parse(JSON.stringify(A.radice))) }
  let id = 0; const fn: string[] = []
  const scrivi = (n: Nodo): string => {
    const nome = `f${id++}`, P = 'p', T = 't'
    let corpo = ''
    switch (n.k) {
      case 'onde': corpo = `return .5+.5*sin(dot(${P}, vec2(cos(${n.ang.toFixed(3)}),sin(${n.ang.toFixed(3)})))*${n.f.toFixed(3)} + ${T}*.4);`; break
      case 'rumore': corpo = `float v=0., a=.5; vec2 q=${P}*${n.s.toFixed(3)}+${T}*.05; for(int i=0;i<${n.o};i++){ v+=a*vn(q); q=q*2.03+3.1; a*=.5; } return v/(1.-pow(.5,${n.o.toFixed(1)}));`; break
      case 'celle': corpo = `vec2 q=${P}*${n.s.toFixed(3)}, i=floor(q), f=fract(q); float d=9.; for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 o=vec2(x,y); vec2 c=o+.5+.4*sin(${T}*.2+6.28*h2(i+o))-f; d=min(d,length(c)); } return clamp(d,0.,1.);`; break
      case 'bordi': corpo = `vec2 q=${P}*${n.s.toFixed(3)}, i=floor(q), f=fract(q); float d1=9., d2=9.; for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 o=vec2(x,y); float d=length(o+h2(i+o)-f); if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d; } return 1.-smoothstep(0., ${n.w.toFixed(3)}, d2-d1);`; break // i confini delle celle (Voronoi F2-F1)
      case 'anelli': corpo = `return .5+.5*sin(length(${P}-.5)*${n.f.toFixed(3)}-${T}*.5);`; break
      case 'griglia': corpo = `vec2 g=abs(fract(${P}*${n.f.toFixed(3)})-.5); return 1.-smoothstep(${n.w.toFixed(3)}*.5, ${n.w.toFixed(3)}, min(g.x,g.y));`; break
      case 'retino': corpo = `vec2 q=rot(${n.ang.toFixed(3)})*${P}*${n.f.toFixed(3)}; vec2 g=fract(q)-.5; float s=.25+.2*sin(${P}.x*3.+${P}.y*2.); return 1.-smoothstep(s-.05,s+.05,length(g));`; break
      case 'gabor': corpo = `float v=0.; for(int i=0;i<${n.n};i++){ vec2 c=h2(vec2(float(i),7.)); float a=${n.ang.toFixed(3)}+float(i)*.7; v+=exp(-12.*dot(${P}-c,${P}-c))*cos(dot(${P},vec2(cos(a),sin(a)))*${n.f.toFixed(3)}+${T}*.3); } return .5+.5*clamp(v,-1.,1.);`; break
      case 'somma': corpo = `return clamp((${scrivi(n.a)}(${P},${T})+${scrivi(n.b)}(${P},${T}))*.5,0.,1.);`; break
      case 'prodotto': corpo = `return ${scrivi(n.a)}(${P},${T})*${scrivi(n.b)}(${P},${T});`; break
      case 'max': corpo = `return max(${scrivi(n.a)}(${P},${T}),${scrivi(n.b)}(${P},${T}));`; break
      case 'min': corpo = `return min(${scrivi(n.a)}(${P},${T}),${scrivi(n.b)}(${P},${T}));`; break
      case 'liscio': corpo = `float a=${scrivi(n.a)}(${P},${T}), b=${scrivi(n.b)}(${P},${T}), k=${n.r.toFixed(3)}; float hh=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,hh)-k*hh*(1.-hh);`; break
      case 'miscela': corpo = `return mix(${scrivi(n.a)}(${P},${T}),${scrivi(n.b)}(${P},${T}),${scrivi(n.m)}(${P},${T}));`; break
      case 'soglia': corpo = `return smoothstep(${n.t.toFixed(3)}-${n.w.toFixed(3)},${n.t.toFixed(3)}+${n.w.toFixed(3)},${scrivi(n.a)}(${P},${T}));`; break
      case 'piega': corpo = `return abs(${scrivi(n.a)}(${P},${T})*2.-1.);`; break
      case 'spazio': {
        const q = n.m === 'ruota' ? `rot(${n.v.toFixed(3)}+${T}*.02)*(${P}-.5)+.5` : n.m === 'scala' ? `(${P}-.5)*${n.v.toFixed(3)}+.5` : n.m === 'ripeti' ? `fract(${P}*${Math.max(1, Math.round(n.v * 2))}.)` : n.m === 'simmetria' ? `vec2(abs(${P}.x-.5)+.5, ${P}.y)` : n.m === 'torci' ? `rot(length(${P}-.5)*${(n.v * 4).toFixed(3)})*(${P}-.5)+.5` : n.m === 'disturba' ? `${P}+(vec2(vn(${P}*6.+${T}*.1),vn(${P}*6.+9.))-.5)*${(n.v * 0.15).toFixed(3)}` : `vec2(atan(${P}.y-.5,${P}.x-.5)/6.2832+.5, length(${P}-.5)*${n.v.toFixed(3)})`
        corpo = `return ${scrivi(n.a)}(${q},${T});`; break
      }
    }
    fn.push(`float ${nome}(vec2 p, float t){ ${corpo} }`)
    return nome
  }
  const radice = scrivi(A.radice)
  const [c0, c1, c2] = colori
  return `${BASE}
${fn.join('\n')}
void main(){ vec2 p = gl_FragCoord.xy/u_resolution.xy; float v = clamp(${radice}(p, u_time), 0., 1.);
  ${A.dither ? `float q = ${A.dither}.; v = floor(v*q + bayer4(gl_FragCoord.xy))/q;` : ''}
  vec3 a=oklab(${vec(c0)}), b=oklab(${vec(c1)}), c=oklab(${vec(c2)});
  vec3 lab = mix(a, b, v)${A.tinte >= 3 ? '; lab = mix(lab, c, smoothstep(.82, .97, v))' : ''}; // l'accento solo sulle punte
  gl_FragColor = vec4(dalab(lab), 1.); }`
}

// ── guardare: si rende davvero e si misura ──────────────────────────────────────────────────────────────────
let gl: WebGLRenderingContext | null = null, cv: HTMLCanvasElement | null = null
const LATO = 96
function rendi(codice: string): Uint8Array | null {
  if (!cv) { cv = document.createElement('canvas'); cv.width = cv.height = LATO; gl = cv.getContext('webgl', { preserveDrawingBuffer: true }) }
  const g = gl; if (!g) return null
  const sh = (t: number, s: string) => { const x = g.createShader(t)!; g.shaderSource(x, s); g.compileShader(x); return g.getShaderParameter(x, g.COMPILE_STATUS) ? x : null }
  const vs = sh(g.VERTEX_SHADER, 'attribute vec2 q; void main(){ gl_Position = vec4(q,0.,1.); }'), fs = sh(g.FRAGMENT_SHADER, 'precision highp float; uniform float u_time; uniform vec2 u_resolution; uniform float u_seed;\n' + codice)
  if (!vs || !fs) return null
  const pr = g.createProgram()!; g.attachShader(pr, vs); g.attachShader(pr, fs); g.linkProgram(pr); if (!g.getProgramParameter(pr, g.LINK_STATUS)) return null
  g.useProgram(pr); const b = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, b); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), g.STATIC_DRAW)
  const l = g.getAttribLocation(pr, 'q'); g.enableVertexAttribArray(l); g.vertexAttribPointer(l, 2, g.FLOAT, false, 0, 0)
  g.uniform1f(g.getUniformLocation(pr, 'u_time'), 1.7); g.uniform2f(g.getUniformLocation(pr, 'u_resolution'), LATO, LATO); g.uniform1f(g.getUniformLocation(pr, 'u_seed'), 3.1)
  g.viewport(0, 0, LATO, LATO); g.drawArrays(g.TRIANGLES, 0, 6)
  const px = new Uint8Array(LATO * LATO * 4); g.readPixels(0, 0, LATO, LATO, g.RGBA, g.UNSIGNED_BYTE, px)
  g.deleteProgram(pr); g.deleteShader(vs); g.deleteShader(fs); g.deleteBuffer(b)
  return px
}
export type Misura = { varieta: number; bordi: number; entropia: number; firma: number[] }
function misura(px: Uint8Array): Misura {
  const L = new Float32Array(LATO * LATO); for (let i = 0; i < L.length; i++) L[i] = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) / 255
  let m = 0, m2 = 0, e = 0; const h = new Array(16).fill(0)
  for (let y = 0; y < LATO; y++) for (let x = 0; x < LATO; x++) { const i = y * LATO + x, v = L[i]; m += v; m2 += v * v; h[Math.min(15, Math.floor(v * 16))]++; if (x < LATO - 1 && y < LATO - 1) e += Math.abs(v - L[i + 1]) + Math.abs(v - L[i + LATO]) }
  const n = L.length, varieta = Math.sqrt(Math.max(0, m2 / n - (m / n) ** 2)), ent = -h.reduce((s, c) => s + (c ? (c / n) * Math.log2(c / n) : 0), 0) / 4
  return { varieta, bordi: Math.min(1, e / n * 4), entropia: ent, firma: h.map(c => c / n) }
}
/** il voto: varietà e struttura (né piatto né rumore puro), novità rispetto agli altri tenuti, costo in nodi */
function voto(M: Misura, nodiN: number, altri: Misura[]): number {
  const struttura = 1 - Math.abs(M.bordi - 0.25) * 1.6
  const novita = altri.length ? Math.min(...altri.map(o => o.firma.reduce((s, x, i) => s + Math.abs(x - M.firma[i]), 0))) : 1
  // un albero di un nodo solo è una riga: si premia la composizione (fino a una dozzina di nodi), non oltre
  return M.varieta * 1.0 + M.entropia * 0.8 + struttura * 0.6 + Math.min(1, novita) * 0.5 + Math.min(nodiN, 12) * 0.05 - Math.max(0, nodiN - 18) * 0.03
}

/** l'evoluzione: una popolazione che si muta e si incrocia per qualche generazione; si tiene il migliore */
export function evolvi(r: Rnd, colori: [string, string, string], o: { semi?: Albero[]; spinte?: Partial<Record<typeof SORGENTI[number], number>>; pop?: number; generazioni?: number; archivio?: Misura[] } = {}) {
  const pop = o.pop ?? 12, gen = o.generazioni ?? 6, arch = o.archivio ?? []
  let gente: { A: Albero; v: number; M: Misura | null }[] = []
  const prova = (A: Albero) => { const px = rendi(inGLSL(A, colori)); if (!px) return { A, v: -9, M: null }; const M = misura(px); return { A, v: voto(M, conta(A.radice), arch), M } }
  for (const s of o.semi ?? []) gente.push(prova(s))
  while (gente.length < pop) gente.push(prova({ radice: genera(r, o.spinte), dither: r() < 0.35 ? 2 + Math.floor(r() * 3) : 0, tinte: r() < 0.5 ? 3 : 2 }))
  for (let g = 0; g < gen; g++) {
    gente.sort((a, b) => b.v - a.v); const elite = gente.slice(0, Math.ceil(pop / 3)), figli: typeof gente = []
    while (elite.length + figli.length < pop) { const a = elite[Math.floor(r() * elite.length)].A, b = elite[Math.floor(r() * elite.length)].A; figli.push(prova(r() < 0.35 ? incrocia(r, a, b) : muta(r, a))) }
    gente = [...elite, ...figli]
  }
  gente.sort((a, b) => b.v - a.v)
  const meglio = gente[0]
  return { albero: meglio.A, codice: inGLSL(meglio.A, colori), voto: +meglio.v.toFixed(3), misura: meglio.M, nodi: conta(meglio.A.radice), generazioni: gen }
}
