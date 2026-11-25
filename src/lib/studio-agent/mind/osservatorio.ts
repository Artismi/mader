// L'osservatorio: chimici, astronomi, astrofisici e una filosofa della scienza usano la biblioteca di tutti gli universi
// possibili (il simulatore di stateyour: dal cosmo ai quanti, tutto da leggi con fonte) come strumento. Sfogliano
// indirizzi, misurano mondi, contano, formulano ipotesi con la loro fiducia (quante prove ci sono dietro), le mettono
// alla prova sui campioni nuovi e portano in piazza le scoperte. Ogni luogo trovato è anche un indirizzo da cui
// nascono pattern: la biblioteca è la madre degli altri generatori.
// Puro: il simulatore arriva da fuori (CosmoAPI), così gira nel browser del giro e nelle prove in node.

export type CosmoAPI = {
  indirizzoDi: (n: number) => { cosmo: number; galassia: number; stella: number; pianeta: number; regione: number }
  sistema: (c: number, g: number, s: number) => { stella: Record<string, any>; pianeti: unknown[] }
  pianeta: (c: number, g: number, s: number, p: number) => { P: Record<string, any> }
  galassia: (c: number, g: number) => { forma: Record<string, any> }
  descriviIndirizzo: (a: unknown) => string
}
export type Misura = {
  n: number; luogo: string; tipo: string; massa: number; T: number; bar: number; acqua: string; tenuti: string[]
  tettonica: string; dinamo: boolean; anelli: boolean; bloccato: boolean; retrogrado: boolean; lune: number
  stellaM: number; stellaT: number; galassia: string; prebiotica: boolean; autocatalisi?: boolean; energia?: string; da: string; giorno: number
}
export type Ipotesi = { id: string; chi: string; testo: string; se: string; allora: string; si: number; no: number; base: number; baseN: number; fiducia: number; stato: 'aperta' | 'regge' | 'cade'; nata: number }
export type Osservatorio = { campioni: number; misure: Misura[]; scoperte: { giorno: number; chi: string; n: number; testo: string; perche: string }[]; ipotesi: Ipotesi[]; indirizzi: { n: number; perche: string; giorno: number }[]; conteggi: Record<string, number> }

export const SCIENZIATI = [
  { id: 'chimica', nome: 'la chimica', interessi: { atmosfer: 1, acqu: 0.8, molecol: 0.7, sal: 0.5, gas: 0.6, materi: 0.5 } },
  { id: 'astronoma', nome: "l'astronoma", interessi: { stell: 1, galass: 1, ciel: 0.6, luc: 0.5, cosm: 0.7 } },
  { id: 'astrofisico', nome: "l'astrofisico", interessi: { pianet: 1, clim: 0.8, orbit: 0.7, gravit: 0.6, tempo: 0.4 } },
  { id: 'filosofa', nome: 'la filosofa della scienza', interessi: { leg: 1, caso: 0.8, possibil: 0.9, univers: 1, spiegazion: 0.6, prov: 0.6 } },
] as const

const ME = 5.972e24
function misura(api: CosmoAPI, n: number, da: string, giorno: number): Misura | null {
  try {
    const a = api.indirizzoDi(n), s = api.sistema(a.cosmo, a.galassia, a.stella)
    if (a.pianeta == null || a.pianeta >= s.pianeti.length) return null
    const P = api.pianeta(a.cosmo, a.galassia, a.stella, a.pianeta).P
    const g = api.galassia(a.cosmo, a.galassia)
    const tipoG = String(api.descriviIndirizzo(a).match(/galassia \d+ \(([^)]+)\)/)?.[1] ?? '')
    return {
      n, luogo: api.descriviIndirizzo(a), tipo: String(P.tipo ?? '?'), massa: +(P.massaKg / ME).toFixed(3), T: Math.round(P.clima?.T ?? 0), bar: +((P.clima?.pressione ?? 0) / 1e5).toFixed(2),
      acqua: String(P.clima?.acqua ?? 'no'), tenuti: (P.clima?.tenuti ?? []).slice(0, 8), tettonica: String(P.interno?.tettonica ?? '?'), dinamo: !!P.interno?.dinamo,
      anelli: !!(P.anello || P.anelli?.length), bloccato: !!P.bloccato, retrogrado: !!P.retrogrado, lune: Array.isArray(P.lune) ? P.lune.length : 0,
      stellaM: +(s.stella.massa ?? 0).toFixed(2), stellaT: Math.round(s.stella.T ?? 0), galassia: tipoG || (g.forma?.tipo ?? '?'), prebiotica: !!(P.prebiotica?.acquaLiquida && ((P.prebiotica.HCN ?? 0) + (P.prebiotica.formaldeide ?? 0)) > 1e-6), autocatalisi: !!P.prebiotica?.autocatalisi, energia: String(P.energiaChimica?.superficie?.domina ?? ''), da, giorno,
    }
  } catch { return null }
}

// le proprietà su cui si possono fare ipotesi (vero/falso per ogni mondo misurato)
const PROP: Record<string, { testo: string; f: (m: Misura) => boolean }> = {
  roccioso: { testo: 'è roccioso', f: m => m.tipo === 'roccioso' },
  acqua: { testo: 'ha acqua liquida', f: m => m.acqua === 'liquida' },
  temperato: { testo: 'sta tra 0 e 30 °C', f: m => m.T >= 273 && m.T <= 303 },
  dinamo: { testo: 'ha un campo magnetico proprio', f: m => m.dinamo },
  placche: { testo: 'ha la tettonica a placche', f: m => /placche/.test(m.tettonica) },
  aria: { testo: 'ha un\'aria tra 0,5 e 3 bar', f: m => m.bar >= 0.5 && m.bar <= 3 },
  sole: { testo: 'gira attorno a una stella come il Sole (0,7–1,2 masse)', f: m => m.stellaM >= 0.7 && m.stellaM <= 1.2 },
  spirale: { testo: 'sta in una galassia a spirale', f: m => /spirale/.test(m.galassia) },
  lune: { testo: 'ha delle lune', f: m => m.lune > 0 },
  anelli: { testo: 'ha anelli', f: m => m.anelli },
  bloccato: { testo: 'mostra sempre la stessa faccia alla stella', f: m => m.bloccato },
  terra: { testo: 'ha tra 0,5 e 2 masse terrestri', f: m => m.massa >= 0.5 && m.massa <= 2 },
  prebiotica: { testo: 'ha una chimica prebiotica', f: m => m.prebiotica },
}
// chi si chiede che cosa (le loro domande vengono dal mestiere)
const DOMANDE: Record<string, [string, string][]> = {
  chimica: [['aria', 'acqua'], ['acqua', 'prebiotica'], ['dinamo', 'aria'], ['temperato', 'prebiotica']],
  astronoma: [['spirale', 'sole'], ['sole', 'temperato'], ['spirale', 'acqua']],
  astrofisico: [['terra', 'aria'], ['dinamo', 'acqua'], ['placche', 'temperato'], ['bloccato', 'temperato'], ['lune', 'temperato'], ['terra', 'placche']],
  filosofa: [['sole', 'acqua'], ['lune', 'acqua'], ['anelli', 'temperato']],
}
const fiduciaDi = (n: number, k = 8) => n / (n + k) // quante prove: con 8 casi la fiducia è a metà (NARS)
const pct = (x: number) => `${Math.round(x * 100)}%`

/** una campagna di osservazione: ogni scienziato sfoglia la biblioteca a modo suo; poi si contano le prove */
export function campagna(O: Osservatorio, api: CosmoAPI, r: () => number, giorno: number, o: { campioni?: number; caratteri?: Record<string, { visionario: number; prudente: number }> } = {}) {
  const eventi: { tipo: string; chi: string; testo: string; nucleo: string; argomento: string; tema: Record<string, number>; peso: number; dati: Record<string, unknown> }[] = []
  const nuove: Misura[] = []
  const quanti = o.campioni ?? 36
  const temperati = O.misure.filter(m => PROP.temperato.f(m) && m.acqua === 'liquida')
  for (let i = 0; i < quanti; i++) {
    const chi = SCIENZIATI[i % SCIENZIATI.length].id
    // le strategie: a caso per tutta la biblioteca, vicino a un mondo buono (i numeri vicini sono regioni e pianeti vicini), lontanissimo
    let n: number, da: string
    if (chi === 'astrofisico' && temperati.length && r() < 0.5) { const b = temperati[Math.floor(r() * temperati.length)]; n = Math.max(0, b.n + Math.floor((r() - 0.5) * 2000)); da = `vicino a ${b.n}` }
    else if (chi === 'filosofa' && r() < 0.5) { n = Math.floor(r() * 4e9); da = 'lontanissimo, in un altro cosmo' }
    else { n = Math.floor(r() * 2e7); da = 'a caso' }
    const m = misura(api, n, da, giorno); if (m) { nuove.push(m); O.conteggi[chi] = (O.conteggi[chi] ?? 0) + 1 }
  }
  O.campioni += nuove.length
  O.misure = [...O.misure, ...nuove].slice(-600)
  const tutte = O.misure
  // le scoperte: un mondo che somiglia al nostro, un estremo, una rarità
  for (const m of nuove) {
    const simile = m.tipo === 'roccioso' && m.acqua === 'liquida' && m.T >= 268 && m.T <= 308 && m.bar >= 0.3 && m.bar <= 5
    const estremo = m.T > 1200 || (isFinite(m.bar) && m.bar > 500)
    const raro = m.autocatalisi || (m.prebiotica && m.T >= 260 && m.T <= 330) || (m.retrogrado && m.tipo === 'roccioso')
    if (!simile && !estremo && !raro) continue
    const chi = simile ? 'astrofisico' : raro && m.prebiotica ? 'chimica' : estremo ? 'astronoma' : 'astrofisico'
    const descr = `${m.tipo}, ${m.massa} masse terrestri, ${m.T - 273} °C, ${isFinite(m.bar) ? `${m.bar} bar` : 'senza una superficie su cui stare'}${m.acqua === 'liquida' ? ', acqua liquida' : ''}${m.dinamo ? ', campo magnetico' : ''}${/placche/.test(m.tettonica) ? ', tettonica a placche' : ''}${m.prebiotica ? `, chimica prebiotica (acido cianidrico e formaldeide${m.energia ? `, energia soprattutto da ${m.energia}` : ''})` : ''}${m.autocatalisi ? ', molecole che si copiano da sole' : ''}`
    const perche = simile ? 'un mondo dove potrebbe esserci quello che c\'è qui' : estremo ? 'un estremo' : 'una rarità'
    O.scoperte.push({ giorno, chi, n: m.n, testo: descr, perche }); O.indirizzi.push({ n: m.n, perche: `${perche}: ${m.luogo}`, giorno })
    eventi.push({ tipo: 'scoperta', chi, testo: `Al numero ${m.n} (${m.luogo}) c'è un pianeta ${descr}: ${perche}. L'abbiamo trovato tra ${nuove.length} mondi sfogliati oggi (${da(m)}).`, nucleo: `il mondo ${m.n}`, argomento: 'scoperta:' + m.n, tema: { pianet: 1, mond: 0.8, acqu: m.acqua === 'liquida' ? 0.8 : 0, univers: 0.5 }, peso: simile ? 1.2 : 0.9, dati: { domanda: `Quanto è raro un mondo come il ${m.n}? Su ${tutte.length} misurati, ${tutte.filter(x => x.tipo === 'roccioso' && x.acqua === 'liquida').length} hanno acqua liquida.`, proposta: `Una tavola dal numero ${m.n}: il pattern di quel luogo e quello che ci abbiamo misurato.`, rovescio: 'Lo cerchiamo perché somiglia a noi: è un pregiudizio, non una scoperta.', azione: { tipo: 'nota' }, numero: m.n } })
    if (eventi.filter(e => e.tipo === 'scoperta').length >= 2) break
  }
  // le ipotesi: ognuno ne propone una dal suo mestiere, se non c'è già; tutte si rimettono alla prova sui campioni
  for (const s of SCIENZIATI) {
    if (O.ipotesi.filter(h => h.stato === 'aperta').length >= 6) break
    if (r() > 0.45) continue
    const coppie = DOMANDE[s.id].filter(([a, b]) => !O.ipotesi.some(h => h.se === a && h.allora === b))
    if (!coppie.length) continue
    const [a, b] = coppie[Math.floor(r() * coppie.length)]
    O.ipotesi.push({ id: `h${giorno}.${O.ipotesi.length}`, chi: s.id, testo: `un mondo che ${PROP[a].testo} ${PROP[b].testo} più spesso degli altri`, se: a, allora: b, si: 0, no: 0, base: 0, baseN: 0, fiducia: 0, stato: 'aperta', nata: giorno })
  }
  for (const h of O.ipotesi.filter(x => x.stato === 'aperta')) {
    const con = tutte.filter(PROP[h.se].f), senza = tutte.filter(m => !PROP[h.se].f(m))
    h.si = con.filter(PROP[h.allora].f).length; h.no = con.length - h.si
    h.base = senza.filter(PROP[h.allora].f).length; h.baseN = senza.length
    const p1 = h.si / Math.max(1, con.length), p0 = h.base / Math.max(1, senza.length)
    h.fiducia = +fiduciaDi(con.length).toFixed(2)
    const diff = p1 - p0
    // regge se la differenza c'è e le prove sono abbastanza; cade se con molte prove la differenza non c'è o è al contrario
    const prima = h.stato
    if (con.length >= 12 && senza.length >= 12 && diff > 0.08 && p1 > p0 * 1.5) h.stato = 'regge'
    else if (con.length >= 24 && diff <= 0.02) h.stato = 'cade'
    const contrario = h.stato === 'cade' && diff < -0.08
    if (h.stato !== prima) {
      const chi = SCIENZIATI.find(s => s.id === h.chi)!
      eventi.push({ tipo: 'ipotesi', chi: h.chi, testo: h.stato === 'regge' ? `L'ipotesi regge: ${h.testo}. Con: ${pct(p1)} (${h.si} su ${con.length}); senza: ${pct(p0)} (${h.base} su ${senza.length}). Fiducia ${pct(h.fiducia)}.` : contrario ? `L'ipotesi cade, anzi è il contrario: ${h.testo}. Con: ${pct(p1)} su ${con.length}, senza: ${pct(p0)} su ${senza.length}. Da capire perché.` : `L'ipotesi cade: ${h.testo}. Con: ${pct(p1)} su ${con.length}, senza: ${pct(p0)} su ${senza.length}. La lascio.`, nucleo: `l'ipotesi ${del_(chi.nome)}`, argomento: 'ipotesi:' + h.id, tema: { leg: 0.8, prov: 0.8, univers: 0.5, mond: 0.5 }, peso: 1, dati: { domanda: h.stato === 'regge' ? `Correlazione o causa? Cosa c'è sotto il legame tra ${PROP[h.se].testo.replace(/^è |^ha /, '')} e ${PROP[h.allora].testo.replace(/^è |^ha /, '')}?` : 'Perché ci aspettavamo il contrario?', rovescio: h.stato === 'regge' ? `Abbiamo guardato solo dove la biblioteca ci ha portato: il campione decide più delle leggi.` : 'Che cada è il risultato più utile della settimana.' } })
    }
  }
  // la filosofa: ogni tanto mette il dito sul metodo, con i numeri della biblioteca
  if (r() < 0.35 && tutte.length >= 40) {
    const abit = tutte.filter(m => m.tipo === 'roccioso' && m.acqua === 'liquida' && m.T >= 268 && m.T <= 308).length
    eventi.push({ tipo: 'metodo', chi: 'filosofa', testo: abit ? `Abbiamo sfogliato ${O.campioni} mondi e ${abit} somigliano al nostro: uno ogni ${Math.round(tutte.length / abit)} di quelli che teniamo a mente. Ma la biblioteca contiene anche tutti i mondi che non sappiamo chiedere.` : `Su ${O.campioni} mondi sfogliati, nessuno somiglia al nostro. Il nostro è raro, o stiamo cercando con la domanda sbagliata?`, nucleo: 'il metodo', argomento: 'metodo:' + giorno, tema: { univers: 1, possibil: 0.8, leg: 0.6, caso: 0.6 }, peso: 0.9, dati: { domanda: 'Che cosa conta come prova, in una biblioteca che contiene tutto?', battuta: 'Borges ci avrebbe messo un bibliotecario cieco.' } })
  }
  O.scoperte = O.scoperte.slice(-80); O.indirizzi = O.indirizzi.slice(-60); O.ipotesi = O.ipotesi.slice(-40)
  return { eventi, nuove }
}
const da = (m: Misura) => m.da === 'a caso' ? 'cercando a caso' : m.da
const del_ = (nome: string) => nome.replace(/^il /, 'del ').replace(/^lo /, 'dello ').replace(/^la /, 'della ').replace(/^l'/, "dell'")
