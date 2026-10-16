/**
 * Presentazioni e caroselli lunghi (blocco A di robustezza): una sequenza di 8–15 slide
 * con ruoli diversi (copertina, sezioni, testo lungo, dati, citazione, elenco, chiusura)
 * e testi molto diversi tra loro.
 *
 * - Continuità di sistema: una sola identità (stile, palette, caratteri, trattamento,
 *   grana) per tutta la sequenza, paginazione e brand come filo; le sezioni a colori invertiti.
 * - Varietà di impaginazione: per ogni slide si provano più sistemi adatti al ruolo e
 *   vince il voto del critico meno la ripetizione (stesso sistema della slide prima,
 *   sistemi già usati); lo specchio si alterna.
 * - Ogni slide regge il suo testo: il sistema giusto per la quantità di testo (voci → archetipi
 *   da elenco, testo lungo → impaginati da lettura), poi gli accorciamenti di `generateSystem`.
 */
import type { DesignContent, Format, Scene, TipoContenuto } from '../types'
import { type Knobs, type SistemaId, SISTEMI, hashText } from './knobs'
import { generateSystem, proposeKnobs, ammesso, SISTEMI_DEL_REGISTRO, SYSTEMS } from './index'
import { styleById } from '../styles'
import { affinita } from './affinita'
import { testoMancante } from './difetti'
import { rifinisciPixel, type Pixel } from './pixel'

export type RuoloSlide = 'copertina' | 'sezione' | 'testo' | 'dati' | 'citazione' | 'elenco' | 'chiusura'
export interface SlideIn { ruolo: RuoloSlide; c: DesignContent }
export interface SlideOut { ruolo: RuoloSlide; scena: Scene | null; sistema?: SistemaId; provati: SistemaId[] }

/** Archetipi che impaginano elenchi di voci (come gli esecutori delle idee con le voci). */
const DA_ELENCO: SistemaId[] = ['scontrino', 'lavagna', 'tabellone', 'foglietti', 'agenzia', 'brutale']
/** Impaginati da lettura: reggono un testo lungo. */
const DA_LETTURA: SistemaId[] = ['rivista', 'tesi', 'modulare', 'colonne', 'composto', 'supertipo']

/** Il contenuto della slide con il tipo giusto per i suoi dati (voci → elenco o dati; citazione). */
export function contenutoSlide(s: SlideIn): DesignContent {
  const c = s.c
  const voci = (c.voci?.length ?? 0) > 0
  const tipo: TipoContenuto | undefined = c.tipo ?? (s.ruolo === 'dati' && voci ? 'dati' : s.ruolo === 'elenco' && voci ? 'consigli' : s.ruolo === 'citazione' ? 'citazione' : undefined)
  return tipo ? { ...c, tipo } : c
}

/** I sistemi da provare per il ruolo, dal più adatto; solo quelli che esistono e accettano il contenuto. */
export function candidatiRuolo(s: SlideIn, registro: string, hasPhoto: boolean): SistemaId[] {
  const c = contenutoSlide(s)
  const voci = (c.voci?.length ?? 0) > 0
  const lungo = (c.body?.length ?? 0) > 220
  const dedicato = c.tipo ? SISTEMI.find(x => x.tipo === c.tipo)?.id : undefined
  const delRegistro = (SISTEMI_DEL_REGISTRO as Record<string, SistemaId[]>)[registro] ?? []
  const lista: SistemaId[] = (() => {
    switch (s.ruolo) {
      case 'copertina': return delRegistro.filter(x => ammesso(c, x, hasPhoto)).slice(0, 4)
      case 'sezione': return ['tesi', 'supertipo', 'eco', 'strisce', 'modulare']
      case 'testo': return lungo ? DA_LETTURA : ['tesi', 'rivista', 'supertipo', 'modulare']
      case 'dati': return voci ? [...(dedicato ? [dedicato] : []), ...DA_ELENCO.slice(0, 3)] : c.numero ? ['dato', 'supertipo', 'tesi'] : ['tesi', 'supertipo']
      case 'citazione': return ['citazione', 'supertipo', 'tesi']
      case 'elenco': return voci ? [...(dedicato ? [dedicato] : []), ...DA_ELENCO] : ['elenco', 'tesi']
      case 'chiusura': return c.cta ? ['chiusura', 'supertipo', 'tesi'] : ['supertipo', 'tesi', 'chiusura']
    }
  })()
  const info = (x: SistemaId) => SISTEMI.find(y => y.id === x)
  return [...new Set(lista)].filter(x => x in SYSTEMS && affinita(c, x) !== 'esclusa' && (hasPhoto || info(x)?.foto !== 'serve'))
}

/**
 * Compone la sequenza. `provati` = sistemi tentati per slide (al massimo 4); ognuno con pochi
 * tentativi, perché la scelta vera è tra i sistemi. Le slide che nessun sistema regge restano
 * `null` (la presentazione non le nasconde: il banco le conta).
 */
export async function presentazione(slides: SlideIn[], format: Format, o: { photo?: string; styleId?: string; seme?: number; perSlide?: number; pixel?: (sc: Scene) => Promise<Pixel> } = {}): Promise<{ slide: SlideOut[]; stile: string }> {
  const copertina = slides.find(s => s.ruolo === 'copertina')?.c ?? slides[0].c
  const base: Knobs = proposeKnobs(copertina, { hasPhoto: !!o.photo, styleId: o.styleId, seme: o.seme, sistemi: ['tesi'] })[0]
  const registro = styleById(base.stile).registro
  const usati = new Map<SistemaId, number>()
  const out: SlideOut[] = []
  let prima: SistemaId | undefined
  for (const [i, s] of slides.entries()) {
    const c = contenutoSlide(s)
    // la foto solo dove fa da immagine (copertina, chiusura); il resto della sequenza è tipografico
    const photo = s.ruolo === 'copertina' || s.ruolo === 'chiusura' ? o.photo : undefined
    const provati = candidatiRuolo(s, registro, !!photo).filter(x => x !== prima).slice(0, o.perSlide ?? 4)
    const prove: { sc: Scene; sistema: SistemaId; punti: number }[] = []
    for (const [j, sistema] of provati.entries()) {
      const k: Knobs = {
        ...base, sistema, idea: undefined, intreccio: false,
        // le sezioni a colori invertiti: il ritmo della sequenza senza cambiare identità
        inverti: s.ruolo === 'sezione',
        seme: (base.seme + (hashText(`${i}|${sistema}`) % 9973) + j) % 99991,
      }
      const sc = await generateSystem(c, format, k, photo, { tentativi: 3, seq: { i, n: slides.length, specchio: i % 2 === 1 } })
      if (!sc) continue
      // la slide regge il suo testo: un campo saltato pesa più di un sistema ripetuto
      const m = testoMancante(sc.els, c)
      const punti = (sc.esame?.voto ?? 0) + ((sc.esame?.carattere?.carattere ?? 50) - 50) * 0.2 - 8 * (usati.get(sistema) ?? 0) - 15 * m.saltati.length - 6 * m.tagliati.length
      prove.push({ sc, sistema, punti })
    }
    // la migliore che regge anche sui pixel veri (corretta se serve)
    let best: { sc: Scene; sistema: SistemaId; punti: number } | null = null
    for (const p of prove.sort((a, b) => b.punti - a.punti)) {
      if (!o.pixel) { best = p; break }
      const r = await rifinisciPixel(p.sc, o.pixel)
      if (r.scena) { best = { ...p, sc: r.scena }; break }
    }
    if (best) { usati.set(best.sistema, (usati.get(best.sistema) ?? 0) + 1); prima = best.sistema }
    out.push({ ruolo: s.ruolo, scena: best?.sc ?? null, sistema: best?.sistema, provati })
  }
  return { slide: out, stile: base.stile }
}
