// L'allestimento delle sale: lo decidono gli abitanti, non il sito. Ogni sala ha le sue pareti invisibili (quante e come
// dipende dalla forma scelta dal curatore) e su di esse ogni tavola ha un posto: lungo la parete (u), all'altezza (v),
// grande quanto (s), girata di quanto (gira, poco: le tavole stanno in piedi). Il primo giorno il curatore appende a nuvola,
// la più amata al centro; poi ogni giorno qualcuno cambia qualcosa con una ragione: accosta due tavole legate, dà più
// spazio alla più amata, fa entrare una tavola nuova, toglie la più debole, ne gira una verso la vicina, ne porta una su
// un'altra parete. Il sito disegna solo quello che c'è scritto qui. Puro: niente DOM.
import type { Territorio } from './territorio'

export type Voce = { id: string; parete: number; u: number; v: number; s: number; gira: number }
export type Allestimento = { forma: string; pareti: number; voci: Voce[]; giorno: number }
type Ab = { id: string; nome: string; tipo: string; carattere: Record<string, number> }
type Azione = { chi: string; testo: string; tipo: string }

export const FORMA: Record<string, string> = { griglia: 'abside', arco: 'abside', colonna: 'abside', parete: 'corridoio', pavimento: 'parete', sospese: 'parete' }
export const PARETI: Record<string, number> = { abside: 3, corridoio: 2, parete: 1 }
const W = 17.6, H = 22 // la misura di una tavola a scala 1 (le stesse unità del sito)
const pick = <T,>(r: () => number, l: T[]) => l[Math.floor(r() * l.length)]

/** due voci sulla stessa parete si toccano? (con un margine) */
const tocca = (a: Voce, b: Voce) => a.parete === b.parete && Math.abs(a.u - b.u) < (W * a.s + W * b.s) / 2 + 3 && Math.abs(a.v - b.v) < (H * a.s + H * b.s) / 2 + 3
/** il primo posto libero a spirale attorno a (u0, v0) sulla parete p */
function posto(voci: Voce[], p: number, s: number, u0 = 0, v0 = 0, salta?: string): [number, number] {
  for (let t = 0; t < 500; t++) { const a = t * 0.55, rr = t * 0.9, u = u0 + Math.cos(a) * rr * 1.4, v = v0 + Math.sin(a) * rr * 0.8; const c: Voce = { id: '', parete: p, u, v, s, gira: 0 }; if (!voci.some(x => x.id !== salta && tocca(x, c))) return [u, v] }
  return [u0, v0]
}

export function allestisci(A: Record<string, Allestimento>, sala: { id: string; q?: number; nome?: string; storia: { giorno: number; chi: string; cosa: string }[] }, info: { curatore?: string; disposizione?: string; quante?: number } | undefined, T: Territorio, abitanti: Ab[], giorno: number, r: () => number): Azione[] {
  const az: Azione[] = [], cur = abitanti.find(a => a.id === info?.curatore) ?? abitanti.find(a => a.id === 'curatore')
  if (!cur || sala.q == null) return az
  const idx = new Map(T.punti.map((p, i) => [p.id, i])), tav = T.punti.filter(p => p.q === sala.q).sort((a, b) => b.peso - a.peso)
  const legame = (a: string, b: string) => { const ia = idx.get(a), ib = idx.get(b); let w = 0; for (const f of T.fili) if ((f[0] === ia && f[1] === ib) || (f[0] === ib && f[1] === ia)) { w = f[2]; break } return w }
  const peso = (id: string) => T.punti[idx.get(id) ?? -1]?.peso ?? 0
  const quante = Math.min(12, Math.max(4, info?.quante ?? 8)), forma = FORMA[info?.disposizione ?? 'griglia'] ?? 'abside', np = PARETI[forma]
  const scala = (id: string) => { const ps = tav.slice(0, quante).map(p => p.peso), mx = Math.max(...ps, 1e-6), mn = Math.min(...ps); return +(0.65 + 0.9 * ((peso(id) - mn) / (mx - mn || 1)) ** 1.3).toFixed(2) }
  const dire = (testo: string, chi = cur) => { az.push({ chi: chi.id, tipo: 'allestisce', testo }); sala.storia.push({ giorno, chi: chi.id, cosa: testo.charAt(0).toLowerCase() + testo.slice(1, 90) }) }
  let X = A[sala.id]
  // il primo giorno, o quando il curatore cambia la forma della sala: appende tutto a nuvola, la più amata al centro e più grande
  if (!X || X.forma !== forma) {
    const voci: Voce[] = []
    tav.slice(0, quante).forEach((p, i) => { const p0 = i === 0 ? 0 : (i % np), s = scala(p.id) * (i === 0 ? 1.35 : 1), [u, v] = posto(voci, p0, s); voci.push({ id: p.id, parete: p0, u: +u.toFixed(1), v: +v.toFixed(1), s, gira: 0 }) })
    A[sala.id] = X = { forma, pareti: np, voci, giorno }
    dire(`Ho appeso le tavole di «${sala.nome}» ${forma === 'corridoio' ? 'su due pareti che si guardano' : forma === 'abside' ? 'su tre pareti, la più amata al centro' : 'su una parete sola'}, a nuvola, grandi quanto le amo.`)
    return az
  }
  // ogni giorno da una a tre mosse, secondo chi passa e il suo carattere
  const mosse = 1 + Math.floor(r() * (1 + (cur.carattere.trascinatore ?? 0) * 2))
  for (let k = 0; k < mosse; k++) {
    const chi = r() < 0.7 ? cur : pick(r, abitanti.filter(a => a.tipo !== 'scienziato')), car = chi.carattere, V = X.voci
    const scelta = r()
    // entra una tavola nuova più amata di una che c'è (e la più debole esce, se la sala è piena)
    const fuori = tav.slice(0, quante + 4).find(p => !V.some(v => v.id === p.id) && p.peso > Math.min(...V.map(v => peso(v.id))))
    if (fuori && scelta < 0.25) {
      if (V.length >= quante) { const debole = [...V].sort((a, b) => peso(a.id) - peso(b.id))[0]; X.voci = V.filter(v => v !== debole) }
      const amica = [...X.voci].sort((a, b) => legame(fuori.id, b.id) - legame(fuori.id, a.id))[0], s = scala(fuori.id)
      const [u, v] = posto(X.voci, amica?.parete ?? 0, s, amica?.u ?? 0, amica?.v ?? 0)
      X.voci.push({ id: fuori.id, parete: amica?.parete ?? 0, u: +u.toFixed(1), v: +v.toFixed(1), s, gira: 0 })
      dire(`In «${sala.nome}» è entrata «${fuori.titolo.slice(0, 40)}»: l'ho messa accanto a quella con cui ha più fili.`, chi); continue
    }
    // accosta: la coppia più legata che sta lontana
    let meglio: [Voce, Voce, number] | null = null
    for (const a of V) for (const b of V) if (a !== b && (a.parete !== b.parete || Math.hypot(a.u - b.u, a.v - b.v) > 40)) { const l = legame(a.id, b.id); if (l > (meglio?.[2] ?? 0)) meglio = [a, b, l] }
    if (meglio && scelta < 0.6) {
      const [a, b] = meglio, [u, v] = posto(V, a.parete, b.s, a.u, a.v, b.id); b.parete = a.parete; b.u = +u.toFixed(1); b.v = +v.toFixed(1)
      dire(`Ho avvicinato due tavole di «${sala.nome}» che si parlano: prima stavano troppo lontane.`, chi); continue
    }
    // girare una tavola verso la sua vicina (il visionario osa di più); il prudente la raddrizza
    const g = pick(r, V)
    if (g && scelta > 0.6 && scelta < 0.72) {
      if ((car.prudente ?? 0) > 0.6 && g.gira) { g.gira = 0; dire(`Ho raddrizzato una tavola in «${sala.nome}»: storta distraeva.`, chi) }
      else { g.gira = +Math.max(-0.35, Math.min(0.35, g.gira + (r() - 0.5) * (0.2 + (car.visionario ?? 0) * 0.3))).toFixed(2); dire(`Ho girato appena una tavola di «${sala.nome}» verso la sua vicina.`, chi) }
      continue
    }
    // più spazio alla più amata: cresce, e chi le sta addosso si sposta
    const best = [...V].sort((a, b) => peso(b.id) - peso(a.id))[0]
    if (best && best.s < 1.6) { best.s = +(best.s * 1.12).toFixed(2); for (const v of V) if (v !== best && tocca(v, best)) { const [u, w] = posto(V, v.parete, v.s, v.u, v.v, v.id); v.u = +u.toFixed(1); v.v = +w.toFixed(1) } dire(`In «${sala.nome}» ho dato più spazio alla tavola più amata.`, chi) }
  }
  X.giorno = giorno
  return az
}
