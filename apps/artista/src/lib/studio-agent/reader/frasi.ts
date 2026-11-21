/**
 * Leggere una frase davvero: un analizzatore superficiale dell'italiano (a gruppi, non a parole sparse).
 *  - i GRUPPI DEL NOME restano interi: articolo, aggettivi, nome (o nome proprio), aggettivi dopo, «di» + gruppo
 *    («la Chiesa cattolica», «un ruolo fondamentale nello sviluppo della cultura»)
 *  - il GRUPPO DEL VERBO con ausiliari, negazione, passivo («non è stata presentata», «ha avuto»)
 *  - il SOGGETTO è il gruppo del nome prima del verbo che non ha una preposizione davanti; gli incisi tra virgole si saltano;
 *    se manca (l'italiano lo sottintende: «È il comune più popoloso»), è l'argomento della lettura
 *  - dopo il verbo: l'oggetto e i complementi, fino alla prossima congiunzione o al prossimo verbo
 *  - le relative («…, che estendeva il suo dominio») diventano una proposizione con soggetto il nome a cui si riferiscono
 * Ogni proposizione tiene le parole com'erano (superficie) e le teste (per ragionare): così quando le ridice sono grammaticali.
 */
import { verbi, posDi } from './concepts'
import { nomeComune } from '../voice/lingua'

export interface Gruppo { testa: string; sup: string; proprio: boolean }
export interface Proposizione { sogg: Gruppo; verbo: { sup: string; forma: string; lemma: string; neg: boolean; passivo: boolean; copula: boolean; rifl: boolean }; ogg?: Gruppo; compl: { prep: string; g: Gruppo; sup: string }[]; implicito: boolean; seguito: string[] }

const ART = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', "l'", 'un', 'uno', 'una', "un'"])
const PREP: Record<string, string> = {}
for (const [p, fs] of Object.entries({ di: 'di del dello della dei degli delle dell\' d\'', a: 'a ad al allo alla ai agli alle all\'', da: 'da dal dallo dalla dai dagli dalle dall\'', in: 'in nel nello nella nei negli nelle nell\'', su: 'su sul sullo sulla sui sugli sulle sull\'', con: 'con col coi', per: 'per', tra: 'tra fra', verso: 'verso', contro: 'contro', senza: 'senza', sotto: 'sotto', dentro: 'dentro', attraverso: 'attraverso', dopo: 'dopo', prima: 'prima', durante: 'durante', presso: 'presso', oltre: 'oltre', entro: 'entro', come: 'come', secondo: 'secondo' })) for (const f of fs.split(' ')) PREP[f] = p
const CONG = new Set(['e', 'ed', 'o', 'od', 'oppure', 'ma', 'però', 'mentre', 'perché', 'quando', 'se', 'dove', 'quindi', 'cioè', 'né', 'anzi', 'poiché', 'benché', 'sebbene', 'affinché', 'finché', 'mentre'])
const REL = new Set(['che', 'cui', 'quale', 'quali'])
const AUX = new Set(['è', 'sono', 'era', 'erano', 'fu', 'furono', 'sarà', 'saranno', 'sia', 'siano', 'fosse', 'fossero', 'ha', 'hanno', 'aveva', 'avevano', 'ebbe', 'ebbero', 'avrà', 'abbia', 'viene', 'vengono', 'veniva', 'venivano', 'venne', 'vennero', 'verrà', 'stato', 'stata', 'stati', 'state', 'può', 'possono', 'poteva', 'potevano', 'deve', 'devono', 'doveva', 'dovevano', 'vuole', 'vogliono', 'sembra', 'sembrano', 'risulta', 'risultano'])
const ESSERE = new Set(['è', 'sono', 'era', 'erano', 'fu', 'furono', 'sarà', 'saranno', 'sia', 'siano', 'fosse', 'fossero'])
const AVV = new Set(['più', 'meno', 'molto', 'anche', 'già', 'ancora', 'così', 'poi', 'sempre', 'mai', 'inoltre', 'oggi', 'spesso', 'soltanto', 'solo', 'quasi', 'tanto', 'ben', 'bene', 'assai', 'circa', 'tuttora', 'invece', 'pure', 'ormai', 'subito', 'allora', 'infatti', 'tuttavia', 'naturalmente', 'stabilmente', 'oltre'])
const CLITICI = new Set(['si', 'ci', 'vi', 'ne', 'lo', 'la', 'li', 'le', 'gli', 'mi', 'ti'])
const QUANT = new Set(['tutto', 'tutta', 'tutti', 'tutte', 'ogni', 'alcuni', 'alcune', 'alcun', 'alcuna', 'molti', 'molte', 'pochi', 'poche', 'questo', 'questa', 'questi', 'queste', 'quello', 'quella', 'quelli', 'quelle', 'suo', 'sua', 'suoi', 'sue', 'loro', 'proprio', 'propria', 'stesso', 'stessa', 'altro', 'altra', 'altri', 'altre', 'primo', 'prima', 'primi', 'prime', 'unico', 'unica', 'nuovo', 'nuova', 'grande', 'grandi', 'principale', 'principali', 'intero', 'intera', 'piccolo', 'piccola', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'cento', 'mille'])
const AGG = /(ale|ali|ico|ica|ici|iche|ano|ana|ani|ane|ese|esi|ivo|iva|ivi|ive|oso|osa|osi|ose|ario|aria|ari|arie|ile|ili|ente|enti|ante|anti|ino|ina|ini|ine|ista|isti|iste|orio|oria|ori|orie|ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite)$/
const PART = /(ato|ata|ati|ate|uto|uta|uti|ute|ito|ita|iti|ite|tto|tta|tti|tte|sso|ssa|ssi|sse|so|sa|si|se|to|ta)$/

interface Tok { s: string; l: string; i: number }
const ARTM = /^(Il|Lo|La|I|Gli|Le|L'|Un|Uno|Una|È|Nel|Nella|Nei|Nelle|Sul|Sulla|Dal|Dalla|Per|Con|In|A|Da|Su|Tra|Fra|Si|Questo|Questa|Durante|Dopo|Secondo)$/
const tokens = (frase: string): Tok[] => {
  if ((frase.match(/\(/g) ?? []).length !== (frase.match(/\)/g) ?? []).length) return [] // parentesi rotte: un pezzo di frase, non si legge
  const t = frase.replace(/[*_`#]+/g, '').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, ' ').replace(/&amp;/g, '&').replace(/\s*\|[^,.;:]*/g, ' ').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/[«»"“”]/g, ' ').replace(/[’`]/g, "'").replace(/(\w)'(?=\w)/g, "$1' ").replace(/(\d),(\d)/g, '$1.$2').replace(/([,;:!?—–]|\.(?!\d))/g, ' $1 ')
  let ts = t.split(/\s+/).filter(Boolean)
  // i titoli di sezione incollati («Territorio Il territorio comunale…», «Trama Sul pianeta…»): via fino alla maiuscola che apre la frase
  for (let i = 1; i < Math.min(5, ts.length); i++) if (ARTM.test(ts[i]) && /^[A-ZÀ-Ý]/.test(ts[i - 1]) && !/[,;:.]/.test(ts[i - 1])) { ts = ts.slice(i); break }
  return ts.map((s, i) => ({ s, l: s.toLowerCase(), i }))
}
const MENTE = /mente$/
const GERUNDIO = /(ando|endo)$/
const maiuscola = (t: Tok) => /^[A-ZÀ-ÝÖÜ]/.test(t.s)
const isPunt = (t?: Tok) => !!t && /^[,;:.!?—–]$/.test(t.s)
const avv = (w: string) => AVV.has(w) || (MENTE.test(w) && w.length > 6)
const togliArt = (x: string) => x.replace(/^(il|lo|la|i|gli|le|un|uno|una)\s+|^(l'|un')/i, '')
const pos = (w: string) => posDi(w)
const isNome = (w: string) => pos(w).has('n')
const isAgg = (w: string, dopoNome: boolean) => pos(w).has('a') || (dopoNome && AGG.test(w) && !pos(w).has('v'))
const isVerbo = (w: string) => verbi().has(w)

export function proposizioni(frase: string, argomento: string): Proposizione[] {
  const T = tokens(frase)
  if (/[-_]\d|campione|^\d/.test(argomento)) argomento = '' // un titolo che non è un nome non fa da soggetto sottinteso
  argomento = argomento.charAt(0).toUpperCase() + argomento.slice(1)
  const out: Proposizione[] = []
  // un gruppo del nome che comincia in i: [art] [quant/agg]* testa (proprio o comune) [agg/part]* [di + gruppo]
  const gruppo = (i: number, profondo = true): { g: Gruppo; fine: number } | null => {
    let j = i; const parti: string[] = []
    while (T[j] && avv(T[j].l) && !ART.has(T[j].l)) j++
    if (T[j] && ART.has(T[j].l)) { parti.push(T[j].s); j++ }
    if (T[j] && /^(uno|una)$/.test(T[j - 1]?.l ?? '') && PREP[T[j].l] === 'di') return { g: { testa: T[j - 1].l, sup: T[j - 1].s, proprio: false }, fine: j } // «uno dei membri»
    while (T[j] && (QUANT.has(T[j].l) || avv(T[j].l) || /^\d/.test(T[j].s) || /^[IVXLCDM]{2,}$/.test(T[j].s) || (ART.has(T[j].l) && parti.length && QUANT.has(T[j - 1].l)) || (!maiuscola(T[j]) && isAgg(T[j].l, false) && T[j + 1] && !isPunt(T[j + 1]) && (isNome(T[j].l) ? isNome(T[j + 1].l) && !isAgg(T[j + 1].l, true) && !AVV.has(T[j + 1].l) : isNome(T[j + 1].l) || isAgg(T[j + 1].l, true)) && !isVerbo(T[j].l)))) { parti.push(T[j].s); j++ }
    const t0 = T[j]
    if (!t0 || isPunt(t0) || CONG.has(t0.l) || REL.has(t0.l) || PREP[t0.l]) return null
    let testa = '', proprio = false
    if (t0.i === 0 && (CLITICI.has(t0.l) || AUX.has(t0.l) || isVerbo(t0.l) && !isNome(t0.l))) return null
    // in testa alla frase la maiuscola non dice niente: è un nome proprio se non è un nome comune del dizionario, o se lo segue un'altra maiuscola («Maria Luisa»)
    if (maiuscola(t0) && !(t0.i === 0 && (isNome(t0.l) || isAgg(t0.l, false)) && nomeComune(t0.l) && !(T[j + 1] && maiuscola(T[j + 1]) && !ARTM.test(T[j + 1].s)))) {
      // nome proprio, anche di più parole («Città del Vaticano», «Robin Söderling»)
      proprio = true; testa = t0.s; parti.push(t0.s); j++
      while (T[j] && (maiuscola(T[j]) || (['del', 'della', 'di', 'dei', 'delle', 'de', 'da'].includes(T[j].l) && T[j + 1] && maiuscola(T[j + 1])))) { parti.push(T[j].s); if (maiuscola(T[j])) testa += ' ' + T[j].s; j++ }
    } else if (isNome(t0.l) || (parti.length && !isVerbo(t0.l) && !ART.has(t0.l) && !CLITICI.has(t0.l) && !AVV.has(t0.l) && !/^\d/.test(t0.s))) {
      testa = t0.l; parti.push(t0.s); j++
      while (T[j] && maiuscola(T[j]) && !ARTM.test(T[j].s)) { parti.push(T[j].s); j++ } // «coppa Davis», «la Regione Toscana»
    }
    else return null
    while (T[j] && (isAgg(T[j].l, true) || avv(T[j].l) || /^\d/.test(T[j].s)) && !isPunt(T[j]) && !GERUNDIO.test(T[j].l) && !(T[j].l === 'più' && !T[j + 1])) {
      if (PART.test(T[j].l) && T[j + 1] && PREP[T[j + 1].l] && PREP[T[j + 1].l] !== 'di') break // «…presentata in concorso»: è un verbo, non un aggettivo
      parti.push(T[j].s); j++
    }
    if (profondo && T[j] && PREP[T[j].l] === 'di') {
      const g2 = gruppo(T[j].l === 'di' || T[j].l === "d'" ? j + 1 : j + 1, false)
      if (g2) { parti.push(T[j].s, T[j].l === 'di' ? g2.g.sup : togliArt(g2.g.sup)); j = g2.fine }
    }
    return { g: { testa, sup: parti.join(' ').replace(/' /g, "'"), proprio }, fine: j }
  }
  // un gruppo del verbo: [non] [clitico] aux* (verbo finito | participio)
  const gruppoVerbo = (i: number) => {
    let j = i, neg = false, rifl = false; const parti: string[] = []
    if (T[j]?.l === 'non') { neg = true; parti.push('non'); j++ }
    while (T[j] && CLITICI.has(T[j].l) && T[j + 1] && (isVerbo(T[j + 1].l) || AUX.has(T[j + 1].l))) { if (T[j].l === 'si') rifl = true; parti.push(T[j].l); j++ }
    const aux: string[] = []
    while (T[j] && AUX.has(T[j].l)) { aux.push(T[j].l); parti.push(T[j].l); j++ }
    while (T[j] && avv(T[j].l)) { parti.push(T[j].l); j++ }
    let lemma = '', forma = aux[0] ?? ''
    const lessicale = T[j] && isVerbo(T[j].l) && !ART.has(T[j - 1]?.l ?? '') ? T[j] : null
    if (lessicale && !aux.length && /(are|ere|ire|rre)$/.test(lessicale.l) && verbi().get(lessicale.l)!.inf === lessicale.l) return null // un infinito da solo («creare», «a partire»): non regge la frase
    if (lessicale && !aux.length && (PART.test(lessicale.l) && !/(ò|ì|é|à)$/.test(lessicale.l) && verbi().get(lessicale.l)!.inf !== lessicale.l && /(at|ut|it)[oaie]$/.test(lessicale.l) || GERUNDIO.test(lessicale.l))) return null // participio o gerundio da solo: un inciso
    if (lessicale && (!aux.length || PART.test(lessicale.l) || /(are|ere|ire|rre)$/.test(lessicale.l))) { lemma = verbi().get(lessicale.l)!.inf; parti.push(lessicale.l); forma ||= lessicale.l; j++ }
    else if (aux.length && T[j] && PART.test(T[j].l) && !isNome(T[j].l) && !ART.has(T[j].l) && !PREP[T[j].l] && T[j].l.length > 4) { lemma = T[j].l; parti.push(T[j].l); j++ }
    else if (aux.length) lemma = ESSERE.has(aux[aux.length - 1]) || /^stat[oaie]$/.test(aux[aux.length - 1]) ? 'essere' : verbi().get(aux[aux.length - 1])?.inf ?? aux[aux.length - 1]
    if (!lemma) return null
    const passivo = !!aux.length && !!lessicale && PART.test(lessicale.l) && aux.some(a => ESSERE.has(a) || /^(viene|vengono|veniva|venivano|venne|vennero|verrà|stat[oaie])$/.test(a)) && !/^(nato|nata|nati|nate|morto|morta|andato|andata|venuto|venuta|diventato|diventata|rimasto|rimasta|tornato|tornata|arrivato|arrivata|stato|stata)$/.test(lessicale.l)
    return { v: { sup: parti.join(' '), forma, lemma, neg, passivo, copula: lemma === 'essere' && !lessicale, rifl }, fine: j }
  }
  // spezza in clausole: punto e virgola, due punti, trattini, e «, ma / , mentre / , perché …»
  const clausole: [number, number][] = []
  let a = 0
  for (let k = 0; k <= T.length; k++) {
    const t = T[k]
    if (!t || /^[;:—–.!?]$/.test(t.s) || (t.s === ',' && T[k + 1] && /^(ma|mentre|perché|poiché|quando|però|quindi|cioè|benché|sebbene)$/.test(T[k + 1].l))) { if (k > a) clausole.push([a, k]); a = k + 1 }
  }
  let antecedente: Gruppo | null = null
  const dopoVerbo = (k: number, c1: number) => {
    let ogg: Gruppo | undefined; const compl: Proposizione['compl'] = [], seguito: string[] = []
    while (k < c1) {
      const t = T[k]
      if (t.s === ',' || CONG.has(t.l) || REL.has(t.l) || GERUNDIO.test(t.l)) break
      if ((isVerbo(t.l) && !isNome(t.l) && !isAgg(t.l, true)) || AUX.has(t.l)) break
      if (PREP[t.l]) {
        const g = gruppo(k + 1)
        if (g) { const sup = `${t.s}${t.s.endsWith("'") ? '' : ' '}${t.l === PREP[t.l] ? g.g.sup : togliArt(g.g.sup)}`; compl.push({ prep: PREP[t.l], g: g.g, sup }); seguito.push(sup); antecedente = g.g; k = g.fine; continue }
        k++; continue
      }
      const g = gruppo(k)
      if (g) { if (!ogg) { ogg = g.g; seguito.push(g.g.sup) } antecedente = g.g; k = g.fine; continue }
      k++
    }
    return { ogg, compl, seguito, fine: k }
  }
  for (const [c0, c1] of clausole) {
    let sogg: Gruppo | null = null, verbo: ReturnType<typeof gruppoVerbo> | null = null, ogg: Gruppo | undefined
    const compl: Proposizione['compl'] = []
    let inciso = false, seguitoV: string[] = []
    for (let k = c0; k < c1;) {
      const t = T[k]
      if (t.s === ',') { if (!verbo && (sogg || compl.length)) inciso = !inciso; k++; continue } // gli incisi tra virgole, prima del verbo, si saltano
      if (inciso) { k++; continue }
      if (t.l === 'che' && antecedente && T[k + 1] && (isVerbo(T[k + 1].l) || AUX.has(T[k + 1].l) || T[k + 1].l === 'non')) {
        // relativa: «…, che estendeva il suo dominio»: una proposizione a sé, con soggetto il nome a cui si riferisce
        const vv = gruppoVerbo(k + 1)
        const ante = antecedente
        if (vv) { const d = dopoVerbo(vv.fine, c1); if ((d.ogg || d.compl.length) && !(d.ogg?.proprio && !/^(il|lo|la|i|gli|le|l'|un|una)/i.test(d.ogg.sup))) out.push({ sogg: ante, verbo: vv.v, ogg: d.ogg, compl: d.compl.slice(0, 2), implicito: false, seguito: d.seguito }); k = d.fine; continue }
      }
      // gerundio o participio da solo: un inciso fino alla prossima virgola
      if (!verbo && (GERUNDIO.test(t.l) && isVerbo(t.l) || (k === c0 && PART.test(t.l) && isVerbo(t.l) && !AUX.has(t.l)))) { while (k < c1 && T[k].s !== ',') k++; k++; continue }
      if (verbo) break
      if (PREP[t.l]) {
        const g = gruppo(k + 1)
        if (g) { if (verbo || compl.length < 2) compl.push({ prep: PREP[t.l], g: g.g, sup: `${t.s}${t.s.endsWith("'") ? '' : ' '}${g.g.sup.replace(/^(il|lo|la|i|gli|le|l') ?/i, (m) => (t.l === PREP[t.l] && !t.s.endsWith("'") ? m : ''))}` }); k = g.fine; continue }
        k++; continue
      }
      // una parola che può essere nome o verbo, seguita da «del/della/dei…», è un nome («parte dei paesi»)
      if (!verbo && isNome(t.l) && isVerbo(t.l) && T[k + 1] && PREP[T[k + 1].l] === 'di' && T[k + 1].l !== 'di') { const g = gruppo(k); if (g) { if (!sogg) sogg = g.g; antecedente = g.g; k = g.fine; continue } }
      if (!verbo && (t.l === 'non' || AUX.has(t.l) || (isVerbo(t.l) && !(ART.has(T[k - 1]?.l ?? '')) && !(isNome(t.l) && !sogg)))) {
        const vv = gruppoVerbo(k)
        if (vv) {
          verbo = vv
          const d = dopoVerbo(vv.fine, c1)
          ogg = d.ogg; compl.length = 0; compl.push(...d.compl); seguitoV = d.seguito
          k = d.fine; continue
        }
      }
      const g = gruppo(k)
      if (g) {
        if (!verbo && !sogg) sogg = g.g
        else if (verbo && !ogg) ogg = g.g
        antecedente = g.g
        k = g.fine; continue
      }
      k++
    }
    if (!verbo) continue
    const implicito = !sogg
    if (!sogg && !argomento) continue
    if (sogg && (sogg.testa.length < 3 || AVV.has(sogg.testa) || QUANT.has(sogg.testa) || CONG.has(sogg.testa) || /^(tale|tali|fin|cui|esso|essa|essi|esse|egli|ella|questo|ciò|invece)$/i.test(sogg.testa))) continue
    const S = sogg ?? { testa: argomento, sup: argomento, proprio: true }
    if (!ogg && !compl.length) continue
    if (verbo.v.lemma === 'essere' && !ogg && !compl.length) continue
    out.push({ sogg: S, verbo: verbo.v, ogg, compl: compl.slice(0, 2), implicito, seguito: seguitoV })
  }
  return out
}

/** la proposizione detta di nuovo, con le parole della fonte (ridotte): soggetto, verbo, oggetto, un complemento */
export function ridici(p: Proposizione, quanti = 2): string {
  const parti = [p.sogg.sup, p.verbo.sup, ...p.seguito.slice(0, quanti)].filter(Boolean)
  return parti.join(' ').replace(/\s+/g, ' ').replace(/' /g, "'").trim()
}
