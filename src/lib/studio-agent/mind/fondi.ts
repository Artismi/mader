// I fondi delle aree: ogni curatore compone lo shader che riveste il suolo della sua area, come si fa per i reel.
// Non lo inventa dal nulla: guarda le tavole che ci stanno (le loro misure visive e le loro tavolozze) e decide col suo
// carattere. Il prudente segue le tavole, il contrario le contraddice, il visionario mescola due motivi, il malinconico
// abbassa il contrasto. Il risultato è codice GLSL di frammento (convenzione u_time, u_resolution, u_seed di hands/shader.ts),
// salvato nei dati della città: il sito lo compila e lo stende dentro il lotto dell'area. Puro: niente DOM.
import type { Carattere } from './citta'

export type Fondo = { v?: number; motivo: string; secondo?: string; colori: [string, string, string]; codice: string; perche: string; giorno: number }
type Vis = { features?: Record<string, number>; palette?: string[] }

// i motivi: ognuno dice da quali misure delle tavole è chiamato, e come si scrive in GLSL (u = coordinate 0..1, t = tempo)
const MOTIVI: Record<string, { chiama: (f: Record<string, number>) => number; glsl: (f: Record<string, number>) => string; dice: string }> = {
  retino: { chiama: f => (f.densita ?? 0) + (f.punti ?? 0), dice: 'un retino di punti, come la stampa delle sue tavole',
    glsl: f => `float m(vec2 u,float t){ float a=${(0.2 + (f.diagonali ?? 0) * 1.2).toFixed(3)}; vec2 r=mat2(cos(a),-sin(a),sin(a),cos(a))*u*${(28 + (f.densita ?? 0.3) * 60).toFixed(1)}; vec2 g=fract(r)-.5; float s=.18+.22*(.5+.5*sin(u.x*3.+u.y*2.+t*.2)); return 1.-smoothstep(s-.04,s+.04,length(g)); }` },
  onde: { chiama: f => (f.orizzontali ?? 0) + (f.linee ?? 0) * 0.5, dice: 'onde lente, per le sue linee orizzontali',
    glsl: f => `float m(vec2 u,float t){ float k=${(18 + (f.orizzontali ?? 0.3) * 40).toFixed(1)}; float y=u.y*k+sin(u.x*${(4 + (f.complessita ?? 0.3) * 8).toFixed(2)}+t*.3)*1.4; return smoothstep(.42,.5,abs(fract(y)-.5)); }` },
  griglia: { chiama: f => (f.verticali ?? 0) + (f.simmetria ?? 0) * 0.6 + (f.struttura_tonale ?? 0) * 0.3, dice: 'una griglia, perché le sue tavole sono costruite e simmetriche',
    glsl: f => `float m(vec2 u,float t){ vec2 g=abs(fract(u*${(10 + (f.verticali ?? 0.3) * 24).toFixed(1)})-.5); float l=min(g.x,g.y); return 1.-smoothstep(.02,.05,l); }` },
  campo: { chiama: f => (f.rumore ?? 0) + (f.entropia ?? 0) * 0.5 + (f.superfici ?? 0) * 0.4, dice: 'un campo che respira, per le sue superfici e la sua grana',
    glsl: f => `float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))+u_seed)*43758.5453); } float n(vec2 p){ vec2 i=floor(p),q=fract(p); q=q*q*(3.-2.*q); return mix(mix(h(i),h(i+vec2(1,0)),q.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),q.x),q.y); } float m(vec2 u,float t){ vec2 p=u*${(3 + (f.complessita ?? 0.3) * 6).toFixed(2)}; float v=n(p+t*.03)*.6+n(p*2.3-t*.02)*.3+n(p*5.)*.1; return smoothstep(.35,.75,v); }` },
  strisce: { chiama: f => (f.diagonali ?? 0) * 1.4 + (f.squilibrio ?? 0), dice: 'strisce in diagonale, per la spinta delle sue tavole',
    glsl: f => `float m(vec2 u,float t){ float d=(u.x+u.y*${(0.6 + (f.diagonali ?? 0.3)).toFixed(2)})*${(14 + (f.densita ?? 0.3) * 30).toFixed(1)}+t*.05; return step(.5+${((f.vuoto ?? 0.3) * 0.35).toFixed(3)},fract(d)); }` },
  macchie: { chiama: f => (f.elementi ?? 0) + (f.forma ?? 0) * 0.5 + (f.vuoto ?? 0) * 0.5, dice: 'macchie come celle, per le forme isolate nel vuoto',
    glsl: f => `vec2 hh(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)))+u_seed)*43758.5453); } float m(vec2 u,float t){ vec2 p=u*${(5 + (f.elementi ?? 0.3) * 10).toFixed(1)}, i=floor(p), q=fract(p); float d=9.; for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec2 o=vec2(x,y); vec2 c=o+.5+.4*sin(t*.1+6.28*hh(i+o))-q; d=min(d,length(c)); } return 1.-smoothstep(.18,.34,d); }` },
}

const media = (vs: Vis[]) => { const f: Record<string, number> = {}, n: Record<string, number> = {}; for (const v of vs) for (const [k, x] of Object.entries(v.features ?? {})) { f[k] = (f[k] ?? 0) + x; n[k] = (n[k] ?? 0) + 1 } for (const k in f) f[k] /= n[k]; return f }
const lum = (h: string) => { const v = parseInt(h.slice(1), 16); return ((v >> 16 & 255) * 0.3 + (v >> 8 & 255) * 0.59 + (v & 255) * 0.11) / 255 }
const vec = (h: string) => { const v = parseInt(h.slice(1), 16); return `vec3(${((v >> 16 & 255) / 255).toFixed(3)},${((v >> 8 & 255) / 255).toFixed(3)},${((v & 255) / 255).toFixed(3)})` }

/** il curatore compone il fondo guardando le tavole dell'area (e, per confronto, quelle di tutta la città) */
export function componiFondo(tavole: Vis[], car: Carattere, r: () => number, giorno: number, prima?: Fondo, tutte?: Vis[]): Fondo {
  const f = media(tavole), g = tutte?.length ? media(tutte) : null
  // i colori: i più frequenti nelle tavolozze dell'area; il chiaro fa da carta, lo scuro da inchiostro, il più saturo da accento
  const conta = new Map<string, number>(); for (const v of tavole) for (const c of (v.palette ?? []).slice(0, 3)) conta.set(c, (conta.get(c) ?? 0) + 1)
  const cs = [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0])
  const per = [...(cs.length ? cs : ['#ebe6dc', '#121212'])].sort((a, b) => lum(b) - lum(a))
  const carta = per[0] ?? '#ebe6dc', inchiostro = per[per.length - 1] ?? '#121212', acc = cs.find(c => c !== carta && c !== inchiostro) ?? inchiostro
  // il motivo: quello che le tavole chiamano di più; il contrario prende quello che chiamano di meno
  // conta quello che l'area ha di suo rispetto a tutta la città (se no tutte le aree chiamerebbero lo stesso motivo)
  const graduatoria = Object.entries(MOTIVI).map(([k, M]) => [k, (g ? (M.chiama(f) - M.chiama(g)) / (M.chiama(g) || 1) : M.chiama(f)) + r() * 0.08] as const).sort((a, b) => b[1] - a[1])
  let motivo = car.contrario > 0.65 ? graduatoria[graduatoria.length - 1][0] : graduatoria[0][0]
  if (prima && motivo === prima.motivo && r() < 0.5) motivo = graduatoria[1][0] // chi rifà il fondo cerca qualcosa di nuovo
  const secondo = car.visionario > 0.55 ? graduatoria.find(([k]) => k !== motivo)![0] : undefined
  // il contrasto: tenue sotto le tavole; il malinconico lo abbassa ancora, il trascinatore lo alza un poco
  const forza = Math.max(0.12, Math.min(0.45, 0.28 - car.malinconico * 0.12 + car.trascinatore * 0.1))
  const M1 = MOTIVI[motivo], M2 = secondo ? MOTIVI[secondo] : null
  const corpo = M2 ? `${M1.glsl(f)}\n${M2.glsl(f).replace(/float m\(/, 'float m2(').replace(/\bh\(/g, 'h2(').replace(/\bn\(/g, 'n2(').replace(/\bhh\(/g, 'hh2(')}` : M1.glsl(f)
  const codice = `${corpo}
void main(){ vec2 u=gl_FragCoord.xy/u_resolution.xy; float t=u_time;
  float a=m(u,t)${M2 ? `, b=m2(u*1.7+.3,t*.7); a=max(a*.8,b*.5)` : ''};
  vec3 carta=${vec(carta)}, ink=${vec(inchiostro)}, acc=${vec(acc)};
  vec3 c=mix(carta, mix(ink, acc, ${(car.visionario * 0.6).toFixed(2)}), a*${forza.toFixed(3)});
  gl_FragColor=vec4(c,1.); }`
  const perche = `${M1.dice}${M2 ? `, mescolato con ${MOTIVI[secondo!].dice.split(',')[0]}` : ''}; i colori vengono dalle sue tavole${car.contrario > 0.65 ? ' (ma il motivo va contro di loro, apposta)' : ''}`
  return { v: 2, motivo, secondo, colori: [carta, inchiostro, acc], codice, perche, giorno }
}

/** due curatori confinanti si accordano sul bordo: si fondono se le aree sono legate, si separano con la carta se no */
export function accordoDiConfine(legame: number, a: Carattere, b: Carattere): 'fondono' | 'contrasto' | 'carta' {
  if (legame > 0.5) return 'fondono'
  if (a.contrario + b.contrario > 1.1 || a.visionario + b.visionario > 1.3) return 'contrasto'
  return 'carta'
}
