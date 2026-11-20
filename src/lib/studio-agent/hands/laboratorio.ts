/**
 * Il laboratorio: il video come programma. Ogni ripresa è una catena di passaggi GLSL che lavorano la materia
 * delle tavole, con i parametri legati ai colpi veri del beat (cassa, rullante, charleston, fase della battuta).
 *
 * I passaggi vengono dalle tecniche della computer art e del creative coding: feedback (il fotogramma prima rientra),
 * slit-scan (ogni riga da un istante diverso), scie "pixel sorting" (Kim Asendorf; qui per marcia di luminanza),
 * deformazioni per rumore e per gradiente dell'immagine stessa, caleidoscopio, frantumazione in celle di Voronoi,
 * resa in ASCII (luminanza → carattere; sui contorni, carattere orientato come il bordo), retino, mappa di colore
 * sulla tavolozza della tavola.
 *
 * Nessuna catena è scritta a mano. Un GENOMA è un programma (passaggi + parametri + a quale colpo risponde ciascuno).
 * Per ogni reel ne nascono molti; ognuno si prova a bassa risoluzione su due battute e si misura:
 *  - complessità visiva in una fascia (né vuota né rumore: complessità come "fatica di lettura", Machado & Cardoso;
 *    McCormack & Gambardella), stimata dall'entropia dei gradienti;
 *  - movimento in una fascia, e niente lampi (salti di luminosità media a tutto schermo);
 *  - sincronia: quanto il cambiamento dell'immagine sale quando suonano cassa e rullante;
 *  - contrasto sufficiente;
 *  - novità rispetto ai programmi già usati.
 * I migliori si incrociano e mutano; vince uno per la prima metà e uno per la seconda (il cambio del beat).
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { Brano } from '../suono/beat'

const W = 720, H = 1280, FPS = 30 // Instagram ingrandisce; a questa misura il software la gira in metà del tempo
export type Passo = 'feedback' | 'scia' | 'fluido' | 'piega' | 'caleido' | 'celle' | 'fette' | 'ascii' | 'retino' | 'tavolozza' | 'rgb' | 'mescola'
export type Leva = 'k' | 's' | 'h' | 'bar' | 'no'
export interface Gene { p: Passo; a: number; b: number; c: number; leva: Leva; quanto: number }
export type Programma = Gene[]

// slot della grammatica: [geometria 0-2] → [tempo 0-1] → [materia 0-1] → [resa 0-1] → [colore 0-1]
const GEOM: Passo[] = ['fluido', 'piega', 'caleido', 'celle', 'fette', 'mescola']
const TEMPO: Passo[] = ['feedback']
const MATERIA: Passo[] = ['scia']
const RESA: Passo[] = ['ascii', 'retino', 'tavolozza']
const COLORE: Passo[] = ['rgb']
const LEVE: Leva[] = ['k', 's', 'h', 'bar', 'no']

function rng(seed: number) { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }
const uno = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)]
const gene = (r: () => number, p: Passo): Gene => ({ p, a: r(), b: r(), c: r(), leva: uno(r, LEVE), quanto: 0.3 + r() * 0.7 })
export function programmaACaso(r: () => number): Programma {
  const g: Programma = []
  const ng = Math.floor(r() * 3); for (let i = 0; i < ng; i++) g.push(gene(r, uno(r, GEOM)))
  if (r() < 0.6) g.push(gene(r, 'feedback'))
  if (r() < 0.5) g.push(gene(r, 'scia'))
  if (r() < 0.7) g.push(gene(r, uno(r, RESA)))
  if (r() < 0.3) g.push(gene(r, 'rgb'))
  if (!g.length) g.push(gene(r, uno(r, GEOM)))
  return g
}
const ordine = (p: Passo) => GEOM.includes(p) ? 0 : TEMPO.includes(p) ? 1 : MATERIA.includes(p) ? 2 : RESA.includes(p) ? 3 : COLORE.includes(p) ? 4 : 5
function sistema(g: Programma) {
  const out = g.sort((x, y) => ordine(x.p) - ordine(y.p)).filter((x, i, a) => !a.slice(0, i).some(y => y.p === x.p) && !(RESA.includes(x.p) && a.slice(0, i).some(y => RESA.includes(y.p)))).slice(0, 6)
  return out.length ? out : [{ p: 'fluido', a: 0.5, b: 0.5, c: 0.5, leva: 'k', quanto: 0.6 } as Gene]
}
export function mutaProgramma(g: Programma, r: () => number): Programma {
  const c = g.map(x => ({ ...x }))
  const k = Math.floor(r() * 5)
  if (k === 0 && c.length < 6) c.push(gene(r, uno(r, [...GEOM, ...TEMPO, ...MATERIA, ...RESA, ...COLORE])))
  else if (k === 1 && c.length > 1) c.splice(Math.floor(r() * c.length), 1)
  else if (k === 2 && c.length) { const x = uno(r, c); x.leva = uno(r, LEVE) }
  else if (c.length) { const x = uno(r, c); const q = uno(r, ['a', 'b', 'c', 'quanto'] as const); x[q] = Math.max(0, Math.min(1, x[q] + (r() - 0.5) * 0.4)) }
  return sistema(c)
}
function incrociaProgrammi(a: Programma, b: Programma, r: () => number): Programma {
  const cut = Math.floor(r() * (a.length + 1)), cut2 = Math.floor(r() * (b.length + 1))
  return sistema([...a.slice(0, cut).map(x => ({ ...x })), ...b.slice(cut2).map(x => ({ ...x }))])
}
export function descriviProgramma(g: Programma): string {
  const N: Record<Passo, string> = { feedback: 'feedback', scia: 'scie di luce', fluido: 'fluido', piega: 'autodeformazione', caleido: 'caleidoscopio', celle: 'celle', fette: 'slit-scan', ascii: 'ASCII', retino: 'retino', tavolozza: 'tavolozza', rgb: 'separazione RGB', mescola: 'mescola tavole' }
  const L: Record<Leva, string> = { k: 'cassa', s: 'rullante', h: 'charleston', bar: 'battuta', no: '' }
  return g.map(x => N[x.p] + (x.leva !== 'no' ? `←${L[x.leva]}` : '')).join(' → ')
}

// ── GLSL ──
const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv; void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`
const HEAD = `#version 300 es
precision highp float; precision highp sampler2DArray;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc, uPrev, uTav, uTav2, uGlifi, uTesto;
uniform sampler2DArray uStoria;
uniform vec2 uRes; uniform float uT, uLeva, uA, uB, uC, uQ, uStoriaN, uStoriaI, uBarF, uRivela, uVerso, uSopra;
uniform vec3 uC0, uC1, uC2, uC3;
float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3 += dot(p3, p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+17.1; a*=.5; } return s; }
float K(){ return uQ*uLeva; }
// il colore delle lettere, pixel per pixel: scuro dove sotto è chiaro, chiaro dove sotto è scuro (contrappunto, niente aloni)
vec3 contrappunto(vec3 sotto){ float l = luma(sotto); vec3 ink = l > 0.45 ? uC0 : uC3; if (abs(luma(ink)-l) < 0.4) ink = l > 0.45 ? vec3(0.05) : vec3(0.97,0.96,0.93); return ink; }
`
const FS: Record<string, string> = {
  copia: HEAD + `void main(){ o = texture(uSrc, vUv); }`,
  // la tavola, con una deriva lenta
  sorgente: HEAD + `float riv(){ float a = uVerso < .25 ? vUv.x : uVerso < .5 ? 1.0-vUv.y : uVerso < .75 ? 1.0-vUv.x : vUv.y; float n = fbm(vUv*vec2(6.,10.))*0.25; return smoothstep(uRivela*1.3-0.15, uRivela*1.3-0.05, a + n); }
    void main(){ vec2 uv = (vUv-.5)/(1.0+0.04*uT/8.0 + 0.03*K()) + .5; vec4 c = texture(uTav, uv); vec4 t = texture(uTesto, vUv); float m = t.a*(1.0-riv()); o = vec4(mix(c.rgb, contrappunto(c.rgb), m), 1.); }`,
  feedback: HEAD + `void main(){
    vec2 c = vUv-.5; float z = 1.0 - (0.004 + 0.02*uA)*(1.0+2.0*K()); float an = (uB-.5)*0.03*(1.0+K());
    c = mat2(cos(an),-sin(an),sin(an),cos(an))*c*z; vec2 d = (vec2(fbm(vUv*3.+uT*.2), fbm(vUv*3.+5.+uT*.2))-.5)*0.006*uC;
    vec4 p = texture(uPrev, c+.5+d), s = texture(uSrc, vUv);
    float keep = 0.55 + 0.33*uA; float m = smoothstep(0.15, 0.6, abs(luma(s.rgb)-luma(p.rgb)));
    o = mix(s, p, keep*(1.0-m*0.5)); }`,
  scia: HEAD + `void main(){
    float th = 0.35 + 0.5*uA - 0.25*K(); vec2 dir = normalize(vec2(cos(uB*6.283), sin(uB*6.283))) / uRes;
    vec4 best = texture(uSrc, vUv); float bl = luma(best.rgb); float L = 40.0 + 260.0*uC*(0.5+K());
    for (int i = 1; i < 48; i++) { float f = float(i)/48.0; vec4 s = texture(uSrc, vUv - dir*L*f); float l = luma(s.rgb); if (l > th && l > bl) { best = s; bl = l; } }
    o = best; }`,
  fluido: HEAD + `void main(){
    float a = (0.01 + 0.06*uA)*(0.4+K()); vec2 p = vUv*(1.5+3.0*uB);
    vec2 d = vec2(fbm(p+vec2(0,uT*.15)), fbm(p+vec2(5.2,1.3)-uT*.12))-.5;
    o = texture(uSrc, vUv + d*a); }`,
  piega: HEAD + `void main(){
    vec2 e = 2.0/uRes; float l = luma(texture(uSrc, vUv).rgb);
    vec2 g = vec2(luma(texture(uSrc, vUv+vec2(e.x,0)).rgb)-luma(texture(uSrc, vUv-vec2(e.x,0)).rgb), luma(texture(uSrc, vUv+vec2(0,e.y)).rgb)-luma(texture(uSrc, vUv-vec2(0,e.y)).rgb));
    float a = (0.02+0.12*uA)*(0.3+K()); vec2 r = vec2(-g.y, g.x);
    o = texture(uSrc, vUv + mix(g, r, uB)*a + (l-.5)*0.01*uC); }`,
  caleido: HEAD + `void main(){
    vec2 c = (vUv-.5)*vec2(uRes.x/uRes.y,1.); float n = floor(3.0+uA*7.0); float an = atan(c.y,c.x) + uT*0.05*(uB-.5) + uBarF*0.0;
    float r = length(c); float s = 6.2831/n; an = mod(an, s); an = abs(an - s*.5);
    vec2 uv = vec2(cos(an), sin(an))*r*(1.0-0.1*K()); uv.x /= uRes.x/uRes.y; o = texture(uSrc, uv + .5 + vec2(uC-.5)*0.2); }`,
  celle: HEAD + `void main(){
    float n = 4.0 + uA*20.0; vec2 p = vUv*vec2(n, n*uRes.y/uRes.x); vec2 i = floor(p), f = fract(p); float md = 9.; vec2 id = i;
    for (int y=-1;y<=1;y++) for (int x=-1;x<=1;x++) { vec2 b = vec2(x,y); vec2 q = b + h22(i+b) - f; float d = dot(q,q); if (d<md){ md=d; id=i+b; } }
    vec2 off = (h22(id*1.7)-.5)*0.25*K()*(0.4+uB); float edge = smoothstep(0.0, 0.04, md);
    o = texture(uSrc, vUv + off) * mix(0.75, 1.0, uC < .5 ? 1.0 : edge); }`,
  fette: HEAD + `void main(){
    float k = uA*0.9 + 0.1; float axis = uB < .5 ? vUv.y : vUv.x; float back = floor(axis*k*(uStoriaN-1.0) + K()*3.0);
    float layer = mod(uStoriaI - back + uStoriaN*4.0, uStoriaN); o = texture(uStoria, vec3(vUv, layer)); }`,
  mescola: HEAD + `void main(){
    float n = fbm(vUv*(2.0+uA*4.0) + uT*0.1); float th = fract(uBarF*0.25 + uB) ; float m = smoothstep(th-0.05, th+0.05, n + K()*0.2);
    o = mix(texture(uSrc, vUv), texture(uTav2, vUv), m); }`,
  ascii: HEAD + `void main(){
    float cs = floor(10.0 + uA*26.0); vec2 cell = floor(vUv*uRes/cs); vec2 uvc = (cell+.5)*cs/uRes;
    vec3 c = texture(uSrc, uvc).rgb; float l = luma(c);
    vec2 e = cs/uRes; float gx = luma(texture(uSrc, uvc+vec2(e.x,0)).rgb)-luma(texture(uSrc, uvc-vec2(e.x,0)).rgb), gy = luma(texture(uSrc, uvc+vec2(0,e.y)).rgb)-luma(texture(uSrc, uvc-vec2(0,e.y)).rgb);
    float gm = length(vec2(gx,gy)); float idx;
    if (gm > 0.25 - 0.15*uB) { float an = atan(gy,gx); float q = mod(floor((an+3.1416)/(3.1416/4.)+.5), 4.); idx = 16.0 + q; }  // contorno: - / | \\
    else idx = floor(clamp(l + (uC-.5)*0.2 + K()*0.15, 0., .999)*16.0);
    vec2 g = fract(vUv*uRes/cs); vec4 gl = texture(uGlifi, vec2((idx+g.x)/20.0, g.y));
    vec3 ink = mix(c, uC1, step(.5, uC)), bg = mix(uC0, c*0.15, 0.3);
    o = vec4(mix(bg, ink*1.2, gl.r), 1.); }`,
  retino: HEAD + `void main(){
    float cs = 6.0 + uA*20.0; float an = 0.3+uB*1.2; mat2 R = mat2(cos(an),-sin(an),sin(an),cos(an)); vec2 p = R*(vUv*uRes)/cs;
    vec2 cid = floor(p)+.5; vec2 uvc = (inverse(R)*cid*cs)/uRes; vec3 c = texture(uSrc, uvc).rgb; float l = luma(c);
    float r = sqrt(1.0-l)*0.75*(1.0+0.3*K()); float d = length(fract(p)-.5);
    o = vec4(mix(uC0, uC < .5 ? uC1 : c, 1.0-smoothstep(r-0.06, r+0.06, d)), 1.); }`,
  tavolozza: HEAD + `void main(){
    vec3 c = texture(uSrc, vUv).rgb; float l = clamp(luma(c) + (fbm(vUv*800.)-.5)*0.08*uC + K()*0.1*(uB-.5), 0., 1.);
    float n = floor(2.0+uA*3.0); float q = floor(l*n)/max(1.,n-1.);
    vec3 a = q < .34 ? mix(uC0, uC1, q*3.) : q < .67 ? mix(uC1, uC2, (q-.33)*3.) : mix(uC2, uC3, (q-.67)*3.);
    o = vec4(a, 1.); }`,
  rgb: HEAD + `void main(){ vec2 d = vec2(0.002+0.012*uA*K(), 0.0); o = vec4(texture(uSrc, vUv+d).r, texture(uSrc, vUv).g, texture(uSrc, vUv-d).b, 1.); }`,
  // il testo: piastra e lettere sopra, sempre leggibile
  testo: HEAD + `void main(){ vec4 s = texture(uSrc, vUv), t = texture(uTesto, vUv);
    float a = uVerso < .25 ? vUv.x : uVerso < .5 ? 1.0-vUv.y : uVerso < .75 ? 1.0-vUv.x : vUv.y; float vis = 1.0-smoothstep(uRivela*1.3-0.15, uRivela*1.3-0.05, a + fbm(vUv*vec2(6.,10.))*0.25);
    o = vec4(mix(s.rgb, contrappunto(s.rgb), t.a*vis*uSopra), 1.); }`,
}

interface T2 { t: WebGLTexture; f?: WebGLFramebuffer; w: number; h: number }
export interface Riprese { t0: number; t1: number; tav: number; prog: Programma; testo?: string; centro?: boolean }

/** il motore: un contesto WebGL2 con le sue tessiture; si usa per provare (piccolo) e per girare (grande) */
class Motore {
  gl: WebGL2RenderingContext; cv: HTMLCanvasElement | OffscreenCanvas
  prog: Record<string, { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }> = {}
  w: number; h: number
  buf!: WebGLBuffer; a!: T2; b!: T2; prev!: T2; storia!: WebGLTexture; storiaN = 24; storiaI = 0
  tav: T2[] = []; glifi!: T2; testo!: T2
  constructor(w: number, h: number) {
    this.w = w; this.h = h
    this.cv = document.createElement('canvas'); (this.cv as HTMLCanvasElement).width = w; (this.cv as HTMLCanvasElement).height = h
    const gl = (this.cv as HTMLCanvasElement).getContext('webgl2', { preserveDrawingBuffer: true, antialias: false })
    if (!gl) throw new Error('WebGL2 non disponibile')
    this.gl = gl
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    const buf = gl.createBuffer()!; this.buf = buf; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    for (const [k, fs] of Object.entries(FS)) this.prog[k] = this.compila(fs)
    this.a = this.rt(); this.b = this.rt(); this.prev = this.rt()
    this.storia = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.storia)
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, Math.max(1, w >> 1), Math.max(1, h >> 1), this.storiaN)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    this.testo = this.tex(document.createElement('canvas'))
  }
  compila(fs: string) {
    const gl = this.gl
    const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) ?? 'shader'); return x }
    const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link')
    const u: Record<string, WebGLUniformLocation | null> = {}
    for (const n of ['uSrc', 'uPrev', 'uTav', 'uTav2', 'uGlifi', 'uTesto', 'uStoria', 'uRes', 'uT', 'uLeva', 'uA', 'uB', 'uC', 'uQ', 'uStoriaN', 'uStoriaI', 'uBarF', 'uC0', 'uC1', 'uC2', 'uC3', 'uRivela', 'uVerso', 'uSopra']) u[n] = gl.getUniformLocation(p, n)
    return { p, u }
  }
  rt(): T2 {
    const gl = this.gl, t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.w, this.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT], [gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT]]) gl.texParameteri(gl.TEXTURE_2D, k, v)
    const f = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0)
    return { t, f, w: this.w, h: this.h }
  }
  tex(src: TexImageSource & { width: number; height: number }, rip = true): T2 {
    const gl = this.gl, t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, rip ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, rip ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE)
    return { t, w: src.width, h: src.height }
  }
  aggiorna(t: T2, src: TexImageSource) { const gl = this.gl; gl.bindTexture(gl.TEXTURE_2D, t.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src) }
  /** un passaggio: legge src, scrive dst */
  passa(nome: string, src: T2, dst: T2 | null, u: { tav: T2; tav2: T2; t: number; leva: number; g?: Gene; col: number[][]; barF: number; rivela?: number; verso?: number; sopra?: number }) {
    const gl = this.gl, P = this.prog[nome]
    gl.useProgram(P.p); gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.f! : null); gl.viewport(0, 0, this.w, this.h)
    const bind = (i: number, n: string, t: WebGLTexture, arr = false) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(arr ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D, t); gl.uniform1i(P.u[n], i) }
    bind(0, 'uSrc', src.t); bind(1, 'uPrev', this.prev.t); bind(2, 'uTav', u.tav.t); bind(3, 'uTav2', u.tav2.t); bind(4, 'uGlifi', this.glifi.t); bind(5, 'uTesto', this.testo.t); bind(6, 'uStoria', this.storia, true)
    gl.uniform2f(P.u.uRes, this.w, this.h); gl.uniform1f(P.u.uT, u.t); gl.uniform1f(P.u.uLeva, u.leva); gl.uniform1f(P.u.uBarF, u.barF)
    gl.uniform1f(P.u.uA, u.g?.a ?? 0.5); gl.uniform1f(P.u.uB, u.g?.b ?? 0.5); gl.uniform1f(P.u.uC, u.g?.c ?? 0.5); gl.uniform1f(P.u.uQ, u.g?.quanto ?? 0.5)
    gl.uniform1f(P.u.uStoriaN, this.storiaN); gl.uniform1f(P.u.uStoriaI, this.storiaI)
    gl.uniform1f(P.u.uRivela, u.rivela ?? 1); gl.uniform1f(P.u.uVerso, u.verso ?? 0); gl.uniform1f(P.u.uSopra, u.sopra ?? 0)
    for (let i = 0; i < 4; i++) gl.uniform3fv(P.u[`uC${i}`], u.col[i])
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  /** un fotogramma: sorgente → passaggi del programma → (testo) → schermo; aggiorna feedback e storia */
  fotogramma(pr: Programma, u: { tav: T2; tav2: T2; t: number; lev: Record<Leva, number>; col: number[][]; barF: number; testo: boolean; rivela?: number; verso?: number; sopra?: number }) {
    const gl = this.gl
    this.passa('sorgente', this.a, this.b, { ...u, leva: u.lev.k, g: { p: 'fluido', a: 0, b: 0, c: 0, leva: 'k', quanto: 0.3 } })
    let src = this.b, dst = this.a
    for (const g of pr) {
      this.passa(g.p, src, dst, { ...u, leva: u.lev[g.leva], g }); [src, dst] = [dst, src]
    }
    if (u.testo && (u.sopra ?? 0) > 0.01) { this.passa('testo', src, dst, { ...u, leva: 0 }); [src, dst] = [dst, src] }
    // al canvas e alla memoria del feedback
    this.passa('copia', src, this.prev, { ...u, leva: 0 })
    this.passa('copia', src, null, { ...u, leva: 0 })
    // nella storia (mezza risoluzione), per lo slit-scan
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, src.f!); gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.storia)
    this.storiaI = (this.storiaI + 1) % this.storiaN
    const tmp = gl.createFramebuffer()!; gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, tmp); gl.framebufferTextureLayer(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.storia, 0, this.storiaI)
    gl.blitFramebuffer(0, 0, this.w, this.h, 0, 0, this.w >> 1, this.h >> 1, gl.COLOR_BUFFER_BIT, gl.LINEAR)
    gl.deleteFramebuffer(tmp)
  }
  leggi(): Uint8Array { const gl = this.gl, d = new Uint8Array(this.w * this.h * 4); gl.bindFramebuffer(gl.FRAMEBUFFER, this.prev.f!); gl.readPixels(0, 0, this.w, this.h, gl.RGBA, gl.UNSIGNED_BYTE, d); return d }
}

/** i caratteri dell'ASCII: 16 per la luce (dal vuoto al pieno) + 4 per i contorni */
function atlante(car: string): HTMLCanvasElement {
  const C = ' .,:;-=+*cox%#&@'.split(''), E = ['-', '/', '|', '\\']
  const cv = document.createElement('canvas'); cv.width = 20 * 64; cv.height = 64
  const g = cv.getContext('2d')!; g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height)
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 56px 'JetBrains Mono', ui-monospace, Menlo, monospace`
  ;[...C, ...E].forEach((ch, i) => g.fillText(ch, i * 64 + 32, 34))
  void car
  return cv
}
/** copre 1080×1920 con l'immagine */
function coperta(img: CanvasImageSource & { width: number; height: number }, w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d')!, s = Math.max(w / img.width, h / img.height)
  g.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s)
  return c
}
function tavolozza(img: CanvasImageSource & { width: number; height: number }): number[][] {
  const c = document.createElement('canvas'); c.width = 32; c.height = 40
  const g = c.getContext('2d')!; g.drawImage(img, 0, 0, 32, 40)
  const d = g.getImageData(0, 0, 32, 40).data, px: number[][] = []
  for (let i = 0; i < d.length; i += 4) px.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255])
  const L = (p: number[]) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]
  px.sort((a, b) => L(a) - L(b))
  const q = [0.04, 0.35, 0.7, 0.97].map(f => px[Math.floor(f * (px.length - 1))])
  // il più saturo prende il posto del terzo, così la tavolozza ha un accento
  const sat = (p: number[]) => Math.max(...p) - Math.min(...p)
  const acc = [...px].sort((a, b) => sat(b) - sat(a))[0]
  if (sat(acc) > 0.25) q[2] = acc
  return q
}

// ── la misura ──
function misuraPixel(fr: Uint8Array[], w: number, h: number, lev: number[], sorg?: Uint8Array) {
  const lum = (d: Uint8Array, i: number) => (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255
  // complessità: entropia dei gradienti quantizzati sull'ultimo fotogramma
  const d = fr[fr.length - 1], hist = new Array(16).fill(0); let n = 0, mu = 0, mu2 = 0
  for (let y = 1; y < h - 1; y += 2) for (let x = 1; x < w - 1; x += 2) {
    const i = (y * w + x) * 4, l = lum(d, i), gx = lum(d, i + 4) - lum(d, i - 4), gy = lum(d, i + w * 4) - lum(d, i - w * 4)
    hist[Math.min(15, Math.floor(Math.hypot(gx, gy) * 24))]++; n++; mu += l; mu2 += l * l
  }
  const ent = -hist.reduce((a, c) => a + (c ? (c / n) * Math.log2(c / n) : 0), 0) / 4
  const std = Math.sqrt(Math.max(0, mu2 / n - (mu / n) ** 2))
  // movimento e lampi, e sincronia col beat
  const diff: number[] = [], medie: number[] = []
  for (let k = 0; k < fr.length; k++) {
    let m = 0, dd = 0, c = 0
    for (let i = 0; i < fr[k].length; i += 4 * 37) { const l = lum(fr[k], i); m += l; if (k) dd += Math.abs(l - lum(fr[k - 1], i)); c++ }
    medie.push(m / c); if (k) diff.push(dd / c)
  }
  const mov = diff.reduce((a, b) => a + b, 0) / Math.max(1, diff.length)
  let lampo = 0; for (let k = 1; k < medie.length; k++) lampo = Math.max(lampo, Math.abs(medie[k] - medie[k - 1]))
  // correlazione tra cambiamento e colpi
  const L = lev.slice(1, diff.length + 1), ma = diff.reduce((a, b) => a + b, 0) / diff.length, mb = L.reduce((a, b) => a + b, 0) / L.length
  let num = 0, da = 0, db = 0; for (let k = 0; k < diff.length; k++) { num += (diff[k] - ma) * (L[k] - mb); da += (diff[k] - ma) ** 2; db += (L[k] - mb) ** 2 }
  const sync = da && db ? num / Math.sqrt(da * db) : 0
  // quanto resta della tavola: correlazione a grana grossa (la struttura si riconosce) e differenza fine (è stata trasformata)
  let ponte = 0.5, trasf = 0.2
  if (sorg) {
    const bx = 9, by = 16, A: number[] = [], B: number[] = []
    for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) { let a = 0, b = 0, c = 0; for (let y = Math.floor(j * h / by); y < Math.floor((j + 1) * h / by); y += 2) for (let x = Math.floor(i * w / bx); x < Math.floor((i + 1) * w / bx); x += 2) { const k = (y * w + x) * 4; a += lum(d, k); b += lum(sorg, k); c++ } A.push(a / c); B.push(b / c) }
    const ma = A.reduce((x, y) => x + y, 0) / A.length, mb = B.reduce((x, y) => x + y, 0) / B.length
    let nn = 0, da = 0, db = 0; for (let k = 0; k < A.length; k++) { nn += (A[k] - ma) * (B[k] - mb); da += (A[k] - ma) ** 2; db += (B[k] - mb) ** 2 }
    ponte = da && db ? nn / Math.sqrt(da * db) : 0
    let t = 0, c = 0; for (let i = 0; i < d.length; i += 4 * 3) { t += Math.abs(lum(d, i) - lum(sorg, i)); c++ }
    trasf = t / c
  }
  // colori estranei: saturazione media dell'uscita oltre quella della tavola
  let satO = 0, satS = 0, cc = 0
  if (sorg) for (let i = 0; i < d.length; i += 4 * 11) { const so = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]); const ss = Math.max(sorg[i], sorg[i + 1], sorg[i + 2]) - Math.min(sorg[i], sorg[i + 1], sorg[i + 2]); satO += so; satS += ss; cc++ }
  // tinte estranee: pixel colorati la cui tinta non c'è nella tavola (le iridescenze del moiré)
  const tinta = (r: number, g: number, b: number) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 40) return -1; let h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn); h *= 60; return h < 0 ? h + 360 : h }
  const tinte = new Array(36).fill(0)
  if (sorg) for (let i = 0; i < sorg.length; i += 4 * 5) { const h = tinta(sorg[i], sorg[i + 1], sorg[i + 2]); if (h >= 0) tinte[Math.floor(h / 10) % 36]++ }
  let fuori = 0, tot = 0
  for (let i = 0; i < d.length; i += 4 * 5) { const h = tinta(d[i], d[i + 1], d[i + 2]); tot++; if (h < 0) continue; const k = Math.floor(h / 10) % 36; if (!(tinte[k] + tinte[(k + 1) % 36] + tinte[(k + 35) % 36])) fuori++ }
  const estranei = (cc ? Math.max(0, (satO - satS) / cc / 255) : 0) + (tot ? fuori / tot : 0) * 3
  return { ent, std, mov, lampo, sync, ponte, trasf, estranei }
}
const distanza = (a: Programma, b: Programma) => { const A = new Set(a.map(x => x.p)), B = new Set(b.map(x => x.p)); const u = new Set([...A, ...B]); let s = 0; for (const x of u) if (A.has(x) !== B.has(x)) s++; return s / Math.max(1, u.size) }

export interface Esito { prog: Programma; voto: number; misure: ReturnType<typeof misuraPixel> }
/** l'evoluzione: prova i programmi su due battute a bassa risoluzione e tiene i migliori */
export async function evolvi(o: { brano: Brano; tavole: (CanvasImageSource & { width: number; height: number })[]; seme: number; memoria?: Programma[]; da: number; generazioni?: number; popolazione?: number; log?: (m: string) => void; testo?: HTMLCanvasElement }): Promise<Esito[]> {
  const r = rng(o.seme), w = 108, h = 192
  const M = new Motore(w, h)
  M.glifi = M.tex(atlante('mono'), false)
  const tav = o.tavole.map(t => M.tex(coperta(t, w, h)))
  const col = tavolozza(o.tavole[0])
  // il testo di prova (impaginato dai suoi generatori) entra nell'immagine: il programma deve lasciarlo leggere
  let maschera: Uint8Array | null = null
  if (o.testo) {
    const c = coperta(o.testo, w, h); M.aggiorna(M.testo, c)
    const d = c.getContext('2d')!.getImageData(0, 0, w, h).data; maschera = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) maschera[(h - 1 - y) * w + x] = d[(y * w + x) * 4 + 3] > 128 ? 1 : 0
  }
  const br = o.brano, nF = Math.round(br.beat * 12 * FPS)
  const env = (ts: number[], t: number, dec: number) => { let v = 0; for (const x of ts) { const d = t - x; if (d >= 0 && d < dec * 5) v = Math.max(v, Math.exp(-d / dec)) } return v }
  const lev: number[] = []
  for (let f = 0; f < nF; f++) { const t = o.da + f / FPS; lev.push(Math.max(env(br.cassa, t, 0.08), env(br.rullante, t, 0.1))) }
  // la tavola com'è, per misurare quanto la trasforma
  const sorg = (() => { const c = coperta(o.tavole[0], w, h), g = c.getContext('2d')!; const d = g.getImageData(0, 0, w, h).data; const out = new Uint8Array(d.length); for (let y = 0; y < h; y++) out.set(d.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); return out })()
  const prova = (p: Programma): Esito => {
    const fr: Uint8Array[] = []
    for (let f = 0; f < nF; f++) {
      const t = o.da + f / FPS
      M.fotogramma(p, { rivela: 1, verso: 0, sopra: 0, testo: false, tav: tav[0], tav2: tav[1 % tav.length], t, lev: { k: env(br.cassa, t, 0.08), s: env(br.rullante, t, 0.1), h: env(br.hat, t, 0.04), bar: ((t % (br.beat * 4)) / (br.beat * 4)), no: 0 }, col, barF: t / (br.beat * 4) })
      if (f % 2 === 0 || f > nF - 3) fr.push(M.leggi())
    }
    const lv = lev.filter((_, f) => f % 2 === 0 || f > nF - 3)
    const m = misuraPixel(fr, w, h, lv, sorg)
    // leggibilità: quanto le lettere si staccano da quello che hanno intorno (separazione delle luminanze dentro/fuori)
    let legg = 1.5
    if (maschera) {
      const d = fr[fr.length - 1], L = (i: number) => (d[i * 4] * 0.2126 + d[i * 4 + 1] * 0.7152 + d[i * 4 + 2] * 0.0722) / 255
      let a = 0, a2 = 0, na = 0, b = 0, b2 = 0, nb = 0
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        const i = y * w + x
        if (maschera[i]) { const l = L(i); a += l; a2 += l * l; na++ }
        else if (maschera[i - 2] || maschera[i + 2] || maschera[i - 2 * w] || maschera[i + 2 * w]) { const l = L(i); b += l; b2 += l * l; nb++ }
      }
      if (na > 10 && nb > 10) { const ma = a / na, mb = b / nb, sa = Math.sqrt(Math.max(0, a2 / na - ma * ma)), sb = Math.sqrt(Math.max(0, b2 / nb - mb * mb)); legg = Math.abs(ma - mb) / (sa + sb + 0.02) }
    }
    ;(m as typeof m & { legg: number }).legg = legg
    let v = -Math.abs(m.ent - 0.55) * 4 // complessità in fascia
    v -= Math.max(0, 0.12 - m.std) * 10 // contrasto
    v -= Math.abs(Math.log((m.mov + 1e-3) / 0.035)) * 0.8 // movimento in fascia
    v -= Math.max(0, m.lampo - 0.12) * 30 // niente lampi
    v += m.sync * 2.5 // si muove col beat
    v -= Math.max(0, 0.45 - m.ponte) * 8 + Math.max(0, m.ponte - 0.85) * 6 // la tavola si riconosce ancora, ma non è la stessa
    v -= Math.max(0, 0.1 - m.trasf) * 20 // e deve essere davvero trasformata
    v += Math.min(4, new Set(p.map(x => x.p)).size) * 0.35 // un programma, non un filtro
    v -= m.estranei * 12 // i colori restano quelli della tavola
    v += Math.min(1.5, (m as typeof m & { legg: number }).legg) * 3 // le parole, lavorate dal programma, si leggono ancora
    if (o.memoria?.length) v += Math.min(...o.memoria.slice(-12).map(x => distanza(p, x))) * 1.5 // novità
    return { prog: p, voto: v, misure: m }
  }
  const N = o.popolazione ?? 18
  let pop = Array.from({ length: N }, () => (o.memoria?.length && r() < 0.25 ? mutaProgramma(uno(r, o.memoria), r) : sistema(programmaACaso(r))))
  let es = pop.map(prova)
  for (let g = 0; g < (o.generazioni ?? 6); g++) {
    es.sort((a, b) => b.voto - a.voto)
    o.log?.(`generazione ${g + 1}: ${descriviProgramma(es[0].prog)} (${es[0].voto.toFixed(2)})`)
    const elite = es.slice(0, Math.max(3, N >> 2)).map(x => x.prog)
    pop = [...elite]
    while (pop.length < N) pop.push(r() < 0.5 ? mutaProgramma(uno(r, elite), r) : mutaProgramma(incrociaProgrammi(uno(r, elite), uno(r, elite), r), r))
    es = [...es.slice(0, elite.length), ...pop.slice(elite.length).map(prova)]
    await new Promise(res => setTimeout(res, 0))
  }
  es.sort((a, b) => b.voto - a.voto)
  return es
}

/** gira il reel: riprese (tavola + programma + testo) sul beat */
export async function gira(o: { brano: Brano; tavole: (CanvasImageSource & { width: number; height: number })[]; riprese: Riprese[]; nome: string; testi?: (tav: number, testo: string) => HTMLCanvasElement | null; leggibilita?: { A?: number; B?: number } }): Promise<Blob | null> {
  if (typeof VideoEncoder === 'undefined') return null
  const M = new Motore(W, H)
  M.glifi = M.tex(atlante('mono'), false)
  const tav = o.tavole.map(t => M.tex(coperta(t, W, H)))
  const cols = o.tavole.map(t => tavolozza(t))
  const br = o.brano
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' })
  let errore: unknown = null
  const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { errore = e } })
  ve.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 8_000_000, framerate: FPS })
  const env = (ts: number[], t: number, dec: number) => { let v = 0; for (const x of ts) { const d = t - x; if (d >= 0 && d < dec * 5) v = Math.max(v, Math.exp(-d / dec)) } return v }
  // i testi: già impaginati dai suoi generatori tipografici (un canvas trasparente per ripresa); entrano nell'immagine
  // e si rivelano a passi sui battiti; se il programma li rende poco leggibili, tornano anche sopra, quanto basta
  const vuoto = document.createElement('canvas'); vuoto.width = W; vuoto.height = H
  const legg = o.leggibilita ?? {}
  const nF = Math.round(br.durata * FPS)
  let ultimoTesto = ''
  for (let f = 0; f < nF; f++) {
    const t = f / FPS
    const s = o.riprese.find(x => t >= x.t0 - 1e-6 && t < x.t1) ?? o.riprese[o.riprese.length - 1]
    const tl = t - s.t0
    const chiave = `${s.testo}|${s.tav}`
    if (chiave !== ultimoTesto) { const c = s.testo ? o.testi?.(s.tav, s.testo) : null; M.aggiorna(M.testo, c ? coperta(c, W, H) : vuoto); ultimoTesto = chiave }
    // rivela: un passo per battito, finito in quattro battiti
    const passi = Math.floor(tl / br.beat), fr0 = (tl - passi * br.beat) / br.beat
    const rivela = s.testo ? 1 : 0; void passi; void fr0
    const lg = legg[s.prog === o.riprese[0].prog ? 'A' : 'B'] ?? 1
    M.fotogramma(s.prog, { rivela, verso: (s.tav * 0.37) % 1, sopra: Math.max(0, Math.min(1, 1.3 - lg)), tav: tav[s.tav], tav2: tav[(s.tav + 1) % tav.length], t, lev: { k: env(br.cassa, t, 0.08), s: env(br.rullante, t, 0.1), h: env(br.hat, t, 0.04), bar: (t % (br.beat * 4)) / (br.beat * 4), no: 0 }, col: cols[s.tav], barF: t / (br.beat * 4), testo: true })
    const fr = new VideoFrame(M.cv as HTMLCanvasElement, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
    ve.encode(fr, { keyFrame: f % (FPS * 2) === 0 }); fr.close()
    if (ve.encodeQueueSize > 6) await new Promise(res => setTimeout(res, 5))
    if (errore) throw errore
  }
  await ve.flush()
  if (errore) return null
  muxer.finalize()
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}

/** la tipografia del reel: niente di fisso, un genoma; si allontana da quelle già usate */
export interface Tipografia { famiglia: string; peso: number; cassa: 'normale' | 'maiuscolo' | 'minuscolo'; corpo: number; spazio: number; interlinea: number; allinea: 'sinistra' | 'centro' | 'destra'; posto: 'alto' | 'centro' | 'basso' | 'verticale'; piastra: 'blocco' | 'fascia' | 'contorno' | 'sottolinea' | 'nessuna'; ingresso: 'parola' | 'lettera' | 'riga' | 'tutto'; inverti: boolean }
export function tipografiaACaso(r: () => number, caratteri: string[], memoria: Tipografia[] = []): Tipografia {
  const una = (): Tipografia => {
    const cassa = uno(r, ['normale', 'normale', 'maiuscolo', 'minuscolo'] as const)
    return { famiglia: uno(r, caratteri), peso: uno(r, [300, 400, 600, 800, 900]), cassa, corpo: 0.9 + r() * 0.7, spazio: cassa === 'maiuscolo' ? r() * 0.15 : (r() - 0.6) * 0.06, interlinea: 0.88 + r() * 0.35, allinea: uno(r, ['sinistra', 'centro', 'destra'] as const), posto: uno(r, ['alto', 'centro', 'basso', 'verticale'] as const), piastra: uno(r, ['blocco', 'fascia', 'contorno', 'sottolinea', 'nessuna'] as const), ingresso: uno(r, ['parola', 'lettera', 'riga', 'tutto'] as const), inverti: r() < 0.5 }
  }
  const d = (a: Tipografia, b: Tipografia) => (['famiglia', 'cassa', 'allinea', 'posto', 'piastra', 'ingresso'] as const).filter(k => a[k] !== b[k]).length + Math.abs(a.peso - b.peso) / 300
  let best = una(), bv = -1
  for (let i = 0; i < 12; i++) { const c = una(); const v = memoria.length ? Math.min(...memoria.slice(-8).map(m => d(c, m))) : r(); if (v > bv) { bv = v; best = c } }
  return best
}

/** la sceneggiatura: aggancio con la domanda, riprese a battute, cambio di programma a metà, conclusione, ritorno all'inizio */
export function sceneggia(br: Brano, nTav: number, forte: number, progA: Programma, progB: Programma, testi: { domanda?: string; conclusione?: string; parole: string[] }, seme: number, ritmo = 2): Riprese[] {
  const r = rng(seme), bar = br.beat * 4, out: Riprese[] = []
  const fine = br.durata - bar
  out.push({ t0: 0, t1: 2 * bar, tav: forte, prog: progA, testo: testi.domanda ?? testi.parole[forte] })
  let t = 2 * bar, i = 0
  while (t < fine - 1e-6) {
    const dopo = t >= br.cambio - 1e-6
    let len = Math.min(fine - t, (dopo ? Math.max(1, ritmo / 2) : ritmo) * bar)
    if (!dopo && t + len > br.cambio) len = br.cambio - t
    const tav = (forte + 1 + i++) % nTav
    const conclusione = testi.conclusione && t + len >= fine - 2 * bar - 1e-6 && !out.some(x => x.testo === testi.conclusione)
    if (conclusione) len = Math.min(fine - t, Math.max(len, 2 * bar))
    out.push({ t0: t, t1: t + len, tav, prog: dopo ? progB : progA, testo: conclusione ? testi.conclusione : (r() < 0.35 ? testi.parole[tav] : undefined), centro: !!conclusione })
    t += len
  }
  out.push({ ...out[0], t0: fine, t1: br.durata })
  return out
}
