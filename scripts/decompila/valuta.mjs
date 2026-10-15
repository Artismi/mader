/**
 * Valutazione di un caso del banco: la scena vera (dal motore) contro quella
 * decompilata. Soglie e criteri sono spiegati nel README.
 */

/** Fedeltà minima perché un caso sia riuscito (vedi README, "Soglia di fedeltà"). */
export const SOGLIA_FEDELTA = 0.95
/** Due caratteri sono equivalenti se la stessa riga resa con l'uno e con l'altro differisce meno di così (vedi README). */
export const SOGLIA_EQUIVALENZA = 0.2

const norma = s => s.replace(/\s+/g, ' ').replace(/[’`]/g, "'").trim()

/** Distanza di modifica normalizzata tra due stringhe (0 = uguali). */
function lev(a, b) {
  if (a === b) return 0
  const m = a.length, n = b.length
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n] / Math.max(m, n, 1)
}

export async function valuta({ caso, sistema, vero, r, ms, letture, page }) {
  // testi veri: orizzontali e non decorativi (quelli che il decompilatore deve restituire)
  const veri = vero.els.filter(e => e.kind === 'text' && !e.angle && !e.deco && e.lines.join('').trim())
  const ruotati = vero.els.filter(e => (e.kind === 'text' && (e.angle || e.deco)) || e.kind === 'arcText' || e.kind === 'seal').length
  const trovati = r.scena.els.filter(e => e.kind === 'text')
  const usati = new Set()
  const righe = []
  for (const v of veri) {
    const sv = norma(v.lines.join(' '))
    // abbinamento: il testo più simile, a parità il più vicino
    let best = null, bd = Infinity
    for (const t of trovati) {
      if (usati.has(t.name)) continue
      const d = lev(sv, norma(t.lines.join(' '))) + Math.hypot(t.x - v.x, t.y - v.y) / 1e5
      if (d < bd) { bd = d; best = t }
    }
    if (!best || bd > 0.5) { righe.push({ vero: v.name, testo: v.lines.join(' / '), trovato: null }); continue }
    usati.add(best.name)
    const testoOk = norma(v.lines.join('\n')) === norma(best.lines.join('\n')) || v.lines.map(norma).join('|') === best.lines.map(norma).join('|')
    const stessoTesto = norma(v.lines.join(' ')) === norma(best.lines.join(' '))
    const riga = [...v.lines].sort((a, b) => b.length - a.length)[0]
    const stessa = v.font.family === best.font.family && Math.abs(v.font.weight - best.font.weight) <= 100
    let equiv = 0
    if (!stessa) {
      await page.evaluate(f => window.banco.caricaCaratteri(f), [v.font, best.font])
      equiv = await page.evaluate(o => window.banco.equivalenza(o), { testo: riga, vero: { ...v.font, italic: false }, trovato: { ...best.font, italic: false }, size: Math.min(v.size, 160), tracking: v.tracking ?? 0 })
    }
    const [mv, mt] = await Promise.all([page.evaluate(el => window.banco.misura(el), v), page.evaluate(el => window.banco.misura(el), best)])
    const pos = mv && mt ? Math.hypot(mv.x - mt.x, mv.y - mt.y) : null
    righe.push({
      vero: v.name, trovato: best.name, testo: v.lines.join(' / '), letto: best.lines.join(' / '),
      testoOk: testoOk || stessoTesto, righeUguali: testoOk,
      carattereVero: `${v.font.family} ${v.font.weight}`, carattereTrovato: `${best.font.family} ${best.font.weight}`,
      carattereOk: stessa || equiv < SOGLIA_EQUIVALENZA, stessoCarattere: stessa, equivalenza: +equiv.toFixed(3),
      corpoVero: v.size, corpoTrovato: best.size, erroreCorpo: Math.abs(best.size - v.size) / v.size * 100,
      errorePos: pos,
    })
  }
  const abbinati = righe.filter(x => x.trovato)
  const media = v => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0)
  const testoOk = abbinati.filter(x => x.testoOk).length
  const carattereOk = abbinati.filter(x => x.carattereOk).length
  const extra = trovati.filter(t => !usati.has(t.name)).map(t => t.lines.join(' / '))
  const testoIdentico = testoOk === veri.length
  const caratteriOk = carattereOk === abbinati.length && abbinati.length === veri.length
  return {
    caso, sistema, fedelta: r.fedelta, fedeltaIniziale: r.fedeltaIniziale, giri: r.giri, ms, tempi: r.tempi, letture, avvisi: r.avvisi,
    testiVeri: veri.length, abbinati: abbinati.length, testoOk, carattereOk, ruotatiIgnorati: ruotati, testiInPiu: extra,
    erroreCorpo: media(abbinati.map(x => x.erroreCorpo)), errorePos: media(abbinati.map(x => x.errorePos ?? 0)),
    testoIdentico, caratteriOk, riuscito: testoIdentico && caratteriOk && r.fedelta >= SOGLIA_FEDELTA,
    livelli: r.scena.els.map(e => e.name), righe,
  }
}

export function rapporto(risultati) {
  const ok = risultati.filter(x => !x.errore)
  const riusciti = ok.filter(x => x.riuscito).length
  const media = v => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0)
  const tutte = ok.flatMap(x => x.righe.filter(y => y.trovato))
  const json = {
    casi: risultati.length, riusciti, soglie: { fedelta: SOGLIA_FEDELTA, equivalenza: SOGLIA_EQUIVALENZA },
    fedeltaMedia: media(ok.map(x => x.fedelta)),
    testi: { veri: ok.reduce((a, x) => a + x.testiVeri, 0), identici: tutte.filter(y => y.testoOk).length, carattereEsatto: tutte.filter(y => y.stessoCarattere).length, carattereOk: tutte.filter(y => y.carattereOk).length },
    erroreCorpoMedio: media(tutte.map(y => y.erroreCorpo)), errorePosMedio: media(tutte.map(y => y.errorePos ?? 0)),
    secondiMedi: media(ok.map(x => x.ms / 1000)), risultati,
  }
  const pct = v => `${(v * 100).toFixed(1)}%`
  const md = [
    '# Banco del decompilatore', '',
    `Casi riusciti: **${riusciti} su ${risultati.length}** (testo identico, carattere giusto o equivalente, fedeltà ≥ ${pct(SOGLIA_FEDELTA)}).`, '',
    `Testi: ${json.testi.identici}/${json.testi.veri} identici · carattere esatto ${json.testi.carattereEsatto}, giusto o equivalente ${json.testi.carattereOk} · corpo ±${json.erroreCorpoMedio.toFixed(1)}% · posizione ±${json.errorePosMedio.toFixed(1)} px · fedeltà media ${pct(json.fedeltaMedia)} · ${json.secondiMedi.toFixed(1)} s a grafica.`, '',
    '| caso | sistema | fedeltà (prima) | giri | testo | carattere | corpo | posizione | secondi | esito |', '|---|---|---|---|---|---|---|---|---|---|',
    ...risultati.map(x => x.errore ? `| ${x.caso} | — | errore: ${x.errore.slice(0, 80)} | | | | | | | no |`
      : `| ${x.caso} | ${x.sistema} | ${pct(x.fedelta)} (${pct(x.fedeltaIniziale)}) | ${x.giri} | ${x.testoOk}/${x.testiVeri} | ${x.carattereOk}/${x.abbinati} | ±${x.erroreCorpo.toFixed(1)}% | ±${x.errorePos.toFixed(1)} px | ${(x.ms / 1000).toFixed(1)} | ${x.riuscito ? '✓' : '✗'} |`),
    '', '## Testi per caso', '',
    ...ok.flatMap(x => [
      `### ${x.caso}`, '',
      `Livelli: ${x.livelli.join(', ')}. Tempi (ms): ${Object.entries(x.tempi).map(([k, v]) => `${k} ${v}`).join(', ')}.${x.ruotatiIgnorati ? ` Testi ruotati o decorativi non letti: ${x.ruotatiIgnorati}.` : ''}${x.testiInPiu.length ? ` Testi in più: ${x.testiInPiu.map(t => `"${t}"`).join(', ')}.` : ''}${x.avvisi.length ? ` Avvisi: ${x.avvisi.join('; ')}.` : ''}`, '',
      '| testo vero | letto | carattere vero → trovato | corpo vero → trovato | pos |', '|---|---|---|---|---|',
      ...x.righe.map(y => y.trovato
        ? `| ${y.testo} | ${y.testoOk ? '=' : y.letto} | ${y.carattereVero} → ${y.stessoCarattere ? '=' : `${y.carattereTrovato} (${y.carattereOk ? 'equivalente' : 'diverso'}, ${y.equivalenza})`} | ${y.corpoVero.toFixed(1)} → ${y.corpoTrovato.toFixed(1)} | ${(y.errorePos ?? 0).toFixed(1)} px |`
        : `| ${y.testo} | — non trovato | | | |`),
      '',
    ]),
  ].join('\n')
  return { md, json }
}
