// La vita degli abitanti: le modalità di Porto Vecchio (popolo.js), con oggetti, eventi, relazioni e strumenti della città.
// La catena è la stessa per tutti: bisogni + interessi → progetti (di notte, la mente) → piani (passi su più giorni)
// → azioni (blocchi della giornata, fatti con gli oggetti). Gli oggetti dichiarano dove stanno, in che orari si usano,
// cosa costano, cosa tolgono all'arrivo e per ogni ora, quale interesse soddisfano e quale traccia lasciano.
// Dalla vita emergono le cose: ogni uso lascia una traccia nello spazio; la stessa traccia ripetuta si consolida
// (un sentiero battuto diventa una via, un orto curato un giardino, una panchina frequentata un luogo con un nome);
// chi si trova insieme allo stesso oggetto e condivide un interesse fa un'opera a più mani.
// Puro: niente DOM, niente rete. Tutto dal seme e dalla storia.

import { vestitoDi, type Citta, type Abitante, type Battuta, type Cella } from './citta'
import { radice, type Territorio } from './territorio'

export type Bisogno = 'fame' | 'sonno' | 'cura' | 'compagnia' | 'svago' | 'rabbia' | 'paura' | 'ispirazione' | 'materiali'
const BISOGNI: Bisogno[] = ['fame', 'sonno', 'cura', 'compagnia', 'svago', 'rabbia', 'paura', 'ispirazione', 'materiali']
// quanto cresce ogni bisogno in un'ora (materiali cala con l'uso, non col tempo)
const CRESCE: Partial<Record<Bisogno, number>> = { fame: 0.045, sonno: 0.045, cura: 0.02, compagnia: 0.02, svago: 0.035, ispirazione: 0.02, rabbia: -0.02, paura: -0.015 }

export const INTERESSI = {
  carta: 'la carta e i ritagli', stampa: 'la stampa e il retino', colore: 'il colore', luce: 'la luce e il vetro', crescita: 'le cose che crescono',
  terra: 'la terra e le rocce', cosmo: 'il cielo e i mondi', parola: 'le parole', misura: 'misurare e costruire', tessuto: 'i tessuti e i vestiti',
  memoria: 'le cose vecchie', chiacchiere: 'le chiacchiere', cucina: 'la cucina', cammino: 'camminare', rito: 'le feste e i riti',
} as const
export type Interesse = keyof typeof INTERESSI

export type Traccia = 'sentiero' | 'parola' | 'stampa' | 'macchia' | 'ologramma' | 'pianta' | 'capo' | 'scritta' | 'restauro' | 'misura' | 'cosmo' | 'scavo' | 'festa' | 'incontro' | 'opera'
type Ogg = { label: string; dove: string[]; h?: [number, number]; once?: Partial<Record<Bisogno, number>>; perH?: Partial<Record<Bisogno, number>>; costo?: number; int?: Interesse; traccia?: Traccia; fa: string; giorni?: number[] }
// gli oggetti intelligenti della città. Basta aggiungere una riga perché tutti trovino da soli il nuovo comportamento.
export const OGG: Record<string, Ogg> = {
  letto:     { label: 'il letto', dove: ['casa'], perH: { sonno: -0.17, rabbia: -0.03, paura: -0.02 }, fa: 'dorme' },
  cucina:    { label: 'la cucina di casa', dove: ['casa'], once: { fame: -0.7 }, int: 'cucina', fa: 'cucina a casa' },
  catino:    { label: 'il catino', dove: ['casa'], once: { cura: -0.9 }, fa: 'si lava' },
  tavolata:  { label: 'la tavolata della mensa', dove: ['mensa'], h: [12, 23], once: { fame: -0.75, compagnia: -0.2 }, costo: 1, traccia: 'incontro', fa: 'mangia alla mensa' },
  bancone:   { label: 'il bancone della mensa', dove: ['mensa'], h: [17, 25], perH: { compagnia: -0.08, svago: -0.06, rabbia: -0.03 }, int: 'chiacchiere', traccia: 'incontro', fa: 'beve qualcosa al bancone' },
  panchina:  { label: 'una panchina', dove: ['piazza', 'fontana', 'confine'], h: [7, 23], perH: { svago: -0.06, compagnia: -0.07 }, int: 'chiacchiere', traccia: 'incontro', fa: 'fa due chiacchiere' },
  fontana:   { label: 'la fontana', dove: ['fontana'], h: [6, 22], once: { cura: -0.3 }, perH: { paura: -0.04 }, fa: 'si rinfresca alla fontana' },
  leggio:    { label: 'gli scaffali della biblioteca', dove: ['biblioteca'], h: [8, 20], perH: { ispirazione: -0.12, svago: -0.04 }, int: 'parola', traccia: 'parola', fa: 'legge in biblioteca' },
  torchio:   { label: 'il torchio', dove: ['bottega'], h: [8, 20], perH: { ispirazione: -0.06, svago: -0.05 }, costo: 1, int: 'stampa', traccia: 'stampa', fa: 'stampa al torchio' },
  cavalletto:{ label: 'il cavalletto', dove: ['sala', 'confine', 'piazza'], h: [7, 20], perH: { ispirazione: -0.08, rabbia: -0.04 }, costo: 0.5, int: 'colore', traccia: 'macchia', fa: 'dipinge' },
  forbici:   { label: 'il tavolo dei ritagli', dove: ['bottega', 'sala'], h: [8, 21], perH: { ispirazione: -0.07, svago: -0.04 }, costo: 0.3, int: 'carta', traccia: 'opera', fa: 'ritaglia e incolla' },
  vetri:     { label: 'il banco dei vetri', dove: ['officina'], h: [9, 20], perH: { ispirazione: -0.08 }, costo: 0.5, int: 'luce', traccia: 'ologramma', fa: 'lavora i vetri' },
  telescopio:{ label: 'il telescopio', dove: ['osservatorio'], h: [19, 27], perH: { ispirazione: -0.14, paura: -0.03 }, int: 'cosmo', traccia: 'cosmo', fa: 'guarda il cielo' },
  simulatore:{ label: 'il simulatore degli universi', dove: ['osservatorio'], h: [8, 19], perH: { ispirazione: -0.1 }, int: 'cosmo', traccia: 'cosmo', fa: 'misura i mondi col simulatore' },
  orto:      { label: "un pezzo d'orto", dove: ['giardino', 'confine'], h: [6, 20], perH: { svago: -0.06, rabbia: -0.05 }, int: 'crescita', traccia: 'pianta', fa: "cura l'orto" },
  telaio:    { label: 'il telaio del guardaroba', dove: ['guardaroba'], h: [8, 20], perH: { svago: -0.05 }, costo: 1, int: 'tessuto', traccia: 'capo', fa: 'tesse' },
  muro:      { label: 'un muro lungo la strada', dove: ['strada'], h: [6, 27], once: { rabbia: -0.3 }, costo: 0.3, int: 'parola', traccia: 'scritta', fa: 'lascia un verso su un muro' },
  scaffali:  { label: "gli scaffali dell'archivio", dove: ['archivio'], h: [8, 19], perH: { ispirazione: -0.05, paura: -0.03 }, int: 'memoria', traccia: 'restauro', fa: 'restaura le cose vecchie' },
  banco:     { label: "il banco dell'officina", dove: ['officina'], h: [8, 21], perH: { ispirazione: -0.06 }, costo: 0.5, int: 'misura', traccia: 'misura', fa: 'costruisce in officina' },
  scavo:     { label: 'il punto di scavo', dove: ['confine', 'giardino'], h: [7, 18], perH: { rabbia: -0.06, svago: -0.04 }, int: 'terra', traccia: 'scavo', fa: 'scava e raccoglie pietre' },
  sentiero:  { label: 'il sentiero', dove: ['strada', 'confine'], h: [6, 22], perH: { ispirazione: -0.07, svago: -0.05, rabbia: -0.03 }, int: 'cammino', traccia: 'sentiero', fa: 'cammina' },
  mercato:   { label: 'il mercato dei materiali', dove: ['piazza'], h: [8, 13], once: { materiali: -0.6, compagnia: -0.1 }, int: 'chiacchiere', fa: 'scambia materiali al mercato', giorni: [1, 4] },
  palco:     { label: "il palco dell'assemblea", dove: ['assemblea'], h: [19, 25], perH: { compagnia: -0.1, svago: -0.1 }, int: 'rito', traccia: 'festa', fa: 'sta sotto il palco' },
}

export type Luogo = { id: string; tipo: string; nome: string; x: number; y: number; q?: number; nato?: number; chi?: string }
export type Ricordo = { g: number; testo: string; peso: number; tag: string; chi?: string; dove?: string }
export type Passo = { k: 'go' | 'meet'; luogo: string; h: number; ogg?: string; chi?: string; label: string; fatto?: boolean; oggi?: number }
export type Progetto = { id: string; tipo: string; label: string; passi: Passo[]; dal: number; con?: string; stato: 'in corso' | 'riuscito' | 'fallito' | 'scaduto'; int?: Interesse }
export type Blocco = { h0: number; h1: number; luogo: string; ogg?: string; perche: string; con?: string; progetto?: boolean }
export type Rel = { aff: number; stima: number; ore: number; ultimo: number; litigi: number }
export type VitaAb = {
  bisogni: Record<Bisogno, number>; interessi: Partial<Record<Interesse, number>>; voglia: Partial<Record<Interesse, number>>
  rel: Record<string, Rel>; diario: Ricordo[]; progetti: Progetto[]; evita: Record<string, number>; pensiero?: string
  oggi?: { h: number; luogo: string; x: number; y: number; fa: string; con?: string[] }[]
  saperi: Record<string, number> // cosa sa, e quanto (cresce usandolo)
  argomenti: Record<string, number> // gli argomenti che gli stanno a cuore: dalle letture, dalla piazza, da chi incontra
  letti?: string[] // i motivi di cui ha letto e che non ha ancora provato a fare
  costruiti?: string[] // i motivi che ha in mano (costruiti in officina)
  fatte: Partial<Record<string, number>> // quante volte ha usato ogni oggetto: la ripetizione fa il mestiere
}
export type TracciaSpazio = { id: string; tipo: Traccia; luogo: string; x: number; y: number; chi: string[]; dal: number; ultimo: number; volte: number; int?: Interesse; colore?: string; parola?: string; nome?: string }
export type Vita = { popolo?: Abitante[]; gesti?: Gesto[]; atti?: { chi: string; ogg: string; luogo: string; q?: number; h: number }[]; fuori?: { t: string; s: string; g: number; detto?: number }[]; luoghi: Luogo[]; ab: Record<string, VitaAb>; tracce: TracciaSpazio[]; vie: Record<string, number>; giorno: number; cronaca: { g: number; testo: string }[] }

const su = (x: string) => x.replace(/^il /, 'sul ').replace(/^lo /, 'sullo ').replace(/^la /, 'sulla ').replace(/^l'/, "sull'").replace(/^i /, 'sui ').replace(/^gli /, 'sugli ').replace(/^le /, 'sulle ')
const IN: Record<string, string> = { 'la piazza': 'in piazza', 'la biblioteca': 'in biblioteca', 'la bottega': 'in bottega', "l'officina": 'in officina', "l'archivio": 'in archivio', "l'assemblea": "all'assemblea", 'il guardaroba': 'in guardaroba' }
const a_ = (x: string) => IN[x] ?? x.replace(/^il /, 'al ').replace(/^lo /, 'allo ').replace(/^la /, 'alla ').replace(/^l'/, "all'").replace(/^i /, 'ai ').replace(/^gli /, 'agli ').replace(/^le /, 'alle ')
const di_ = (x: string) => x.replace(/^il /, 'del ').replace(/^lo /, 'dello ').replace(/^la /, 'della ').replace(/^l'/, "dell'").replace(/^i /, 'dei ').replace(/^gli /, 'degli ').replace(/^le /, 'delle ').replace(/^chi /, 'di chi ')
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
const pick = <T,>(r: () => number, l: T[]) => l[Math.floor(r() * l.length)]
const PALETTE = ['#e3361b', '#e8c547', '#3b6fd8', '#2f9e6b', '#d86fb0', '#e8e2d6', '#f08a2c', '#6b4fd8', '#1b1b1b', '#9fd3c7']


// ── la voce: la retorica di Porto Vecchio (serietà davanti all'assurdo, affetto, ironia), ma più alta e poetica.
// Qui nessuno fa il criminale e non ci sono i Grigi; fuori però il mondo è più duro di Porto Vecchio, e se ne parla.
type Tono = 'ironico' | 'malinconico' | 'visionario' | 'trascinatore'
const tonoDi = (a: Abitante, r: () => number): Tono => { const c = a.carattere, l: [Tono, number][] = [['ironico', c.ironico], ['malinconico', c.malinconico], ['visionario', c.visionario], ['trascinatore', c.trascinatore]]; l.sort((x, y) => y[1] - x[1]); return r() < 0.75 ? l[0][0] : l[1][0] }
const VOCE: Record<string, Partial<Record<Tono, ((x: Record<string, string>) => string)[]>>> = {
  litigio: {
    ironico: [x => `Con ${x.b} ci siamo detti cose vere col tono sbagliato. Domani ne rideremo, almeno uno dei due.`, x => `${cap(x.b)} ha torto con molto stile. Glielo riconosco, poi glielo ridico.`],
    malinconico: [x => `Oggi ${x.dove} con ${x.b} non ci siamo trovati. Succede anche alle cose che si vogliono bene.`],
    visionario: [x => `Con ${x.b} abbiamo litigato su come dev'essere il mondo. Almeno ci crediamo tutti e due.`],
    trascinatore: [x => `${cap(x.b)} ed io abbiamo alzato la voce ${x.dove}. Meglio una voce alta che una stanza muta.`] },
  opera: {
    ironico: [x => `Io e ${x.b}, ${x.dove}: ${x.noi} finché la materia ha smesso di obiettare. Resta lì.`],
    malinconico: [x => `Io e ${x.b}, ${x.dove}, in silenzio quasi tutto il tempo: ${x.noi}. Quello che è venuto resta lì, ed è di nessuno dei due.`],
    visionario: [x => `${cap(x.dove)}, con ${x.b}: ${x.noi}. Due mani pensano, due sbagliano bene. Resta lì.`],
    trascinatore: [x => `Ho trascinato ${x.b} ${x.dove}: ${x.noi}. Venite a vedere, prima che cambiamo idea.`] },
  preso: {
    ironico: [x => `${cap(x.b)} mi ha lasciato in tasca «${x.w}». Non so cosa farne, quindi ci penserò per giorni.`],
    malinconico: [x => `${cap(x.b)} ha detto «${x.w}» e la parola mi è rimasta addosso, come un odore.`],
    visionario: [x => `«${x.w}»: ${x.b} me l'ha detta di passaggio, io ci vedo dentro una città intera.`],
    trascinatore: [x => `${cap(x.b)} ha tirato fuori «${x.w}». Domani in piazza la mettiamo al centro.`] },
  contro: {
    ironico: [x => `${cap(x.b)} insiste con «${x.w}». Gli voglio bene, ma la penso al rovescio, e con grande serietà.`],
    malinconico: [x => `${cap(x.b)} parla di «${x.w}» come di una cosa già capita. A me pare ancora aperta, come una ferita.`],
    visionario: [x => `«${x.w}», dice ${x.b}. Io dico: proviamo dall'altra parte, che è lì che non è mai andato nessuno.`],
    trascinatore: [x => `${cap(x.b)} e «${x.w}»: non sono d'accordo, e domani in piazza lo dico davanti a tutti.`] },
  fuori: {
    ironico: [x => `Oggi in biblioteca ho letto «${x.t}» (${x.s}). Pare che fuori abbiano inventato un modo nuovo per non ascoltarsi. Noi siamo rimasti indietro, per fortuna.`, x => `Fuori, dice «${x.t}», tutto va più veloce. Anche il torchio va veloce, se non lo guardi.`],
    malinconico: [x => `Ho letto «${x.t}» (${x.s}). Le notizie di fuori arrivano come la nebbia: prima non le vedi, poi ci sei dentro.`, x => `«${x.t}». Fuori stringono, e qui la sera è così quieta che fa quasi male.`],
    visionario: [x => `«${x.t}» (${x.s}): se fuori costruiscono muri, qui facciamo finestre. È poco, ma è un mestiere.`, x => `Leggo «${x.t}» e penso che una città come la nostra serve proprio adesso: un posto dove si pensa piano, mentre fuori si decide in fretta.`],
    trascinatore: [x => `Avete letto «${x.t}»? (${x.s}). Non è roba da lasciare sugli scaffali: domani in piazza ne parliamo, tutti.`] },
  piazzetta: { ironico: [x => `Ci troviamo sempre ${x.dove}: ormai la chiamano ${x.nome}. Nessuno l'ha deciso, è successo camminando.`] },
  giardino: { malinconico: [x => `${cap(x.dove)} le piante hanno smesso di chiedere permesso: è un giardino.`], ironico: [x => `${cap(x.dove)}: ho piantato due cose per sbaglio, ora è un giardino. La natura non ha senso della misura.`] },
  muroTutti: { visionario: [x => `Sul muro, ${x.dove}, scriviamo in tanti, uno sopra l'altro: una conversazione che non finisce.`] },
  serie: { ironico: [x => `Tre giorni ${x.dove} sulla stessa cosa. Alla fine era lei che guardava me. ${cap(x.label)}: fatto.`], malinconico: [x => `Ho finito ${x.label}. Tre giorni ${x.dove}, e adesso mi manca già.`], visionario: [x => `${cap(x.label)}: tre giorni ${x.dove}. Ogni volta la stessa cosa, ogni volta un'altra.`] },
  insieme: { ironico: [x => `Fatta, ${x.dove}: ${x.label}. Abbiamo litigato solo sui colori, cioè su tutto.`, x => `${cap(x.label)}, ${x.dove}: finita. Nessuno dei due sa chi ha avuto l'idea, e va bene così.`, x => `${cap(x.dove)} abbiamo finito. ${cap(x.b)} dice che è sua, io dico che è mia: quindi è riuscita.`], trascinatore: [x => `${cap(x.label)}: fatta, ${x.dove}. Venite tutti, prima che la cambiamo ancora.`], malinconico: [x => `${cap(x.label)}: finita, ${x.dove}. Sembra fatta da una terza persona che non conosciamo.`, x => `${cap(x.dove)}, con ${x.b}, abbiamo finito. Mi resta la luce di quel pomeriggio, più dell'opera.`], visionario: [x => `${cap(x.label)}, ${x.dove}: nessuno dei due da solo l'avrebbe fatta così.`, x => `${cap(x.dove)} con ${x.b} abbiamo aperto una porta. Dove dà, lo scopriremo.`] },
  conoscere: { ironico: [x => `Ho conosciuto ${x.b}. Abbiamo in comune più di quanto pensassimo e meno di quanto speriamo: un buon inizio.`], malinconico: [x => `Ho conosciuto ${x.b}. Abbiamo parlato poco e bene.`], trascinatore: [x => `${cap(x.b)}: da oggi è dei nostri, anche se non lo sa ancora.`] },
  pace: { ironico: [x => `Con ${x.b} abbiamo fatto pace davanti a un piatto caldo. La ragione l'abbiamo lasciata in cucina.`], malinconico: [x => `Con ${x.b} abbiamo fatto pace. Non ce lo siamo detti, ce lo siamo passati col pane.`] },
  muro: { visionario: [x => `Ho lasciato un verso sul muro, ${x.dove}. Chi passa lo legge, chi vuole risponde.`], ironico: [x => `Ho scritto sul muro, ${x.dove}. Il muro non ha obiettato: è il miglior interlocutore della città.`] },
  vestito: { ironico: [x => `Mi sono fatto un capo nuovo al telaio. Domani mi riconosceranno un po' meno, e mi va benissimo.`], malinconico: [x => `Al telaio ho cucito un capo nuovo con un filo vecchio. Mi sta come un ricordo.`] },
  orto: { ironico: [x => `L'orto, ${x.dove}, è partito. Per ora crescono soprattutto le speranze, ma qualche foglia c'è.`], visionario: [x => `Al confine ho seminato. Fra due quartieri che non si parlano, adesso c'è qualcosa che cresce per tutti e due.`] },
  festa: { ironico: [x => `Festa all'assemblea. Qualcuno ha ballato male con grande convinzione: la cosa più bella della serata.`], trascinatore: [x => `Festa all'assemblea, c'erano quasi tutti. Chi non c'era, domani lo sa.`] },
}
const NOI: Record<string, string> = { leggio: 'abbiamo letto ad alta voce e copiato le frasi buone su un foglio solo', torchio: 'abbiamo stampato al torchio', cavalletto: 'abbiamo dipinto sulla stessa tela', forbici: 'abbiamo ritagliato e incollato', vetri: 'abbiamo lavorato i vetri', telescopio: 'abbiamo guardato il cielo e disegnato quello che c\'era', simulatore: 'abbiamo misurato un mondo col simulatore', orto: 'abbiamo curato l\'orto', telaio: 'abbiamo tessuto', muro: 'abbiamo scritto sul muro', scaffali: 'abbiamo restaurato le cose vecchie', banco: 'abbiamo costruito in officina', scavo: 'abbiamo scavato e messo in fila le pietre', sentiero: 'abbiamo camminato e segnato il sentiero' }
const cap = (t: string) => t ? t[0].toUpperCase() + t.slice(1) : t
function dice(a: Abitante, sit: string, x: Record<string, string>, r: () => number): string {
  const v = VOCE[sit] ?? {}, t = tonoDi(a, r), l = v[t] ?? Object.values(v)[0] ?? []
  return l.length ? l[Math.floor(r() * l.length)](x) : ''
}



// ── i saperi: ognuno sa delle cose, a livelli diversi, e li fa crescere usandoli. Spostano quello che legge, gli strumenti
// che prende in mano, i gesti che fa, di cosa parla. Nessuno sa tutto; nessuno è solo il suo mestiere.
export const SAPERI: Record<string, { int: Interesse[]; str: string[]; verbi: string[]; fonti: string[] }> = {
  architettura: { int: ['misura', 'terra'], str: ['geometria', 'tettonica'], verbi: ['sposta', 'accosta', 'solleva'], fonti: ['rivista:Artribune', 'wiki-en'] },
  grafica: { int: ['stampa', 'colore', 'parola'], str: ['pattern', 'scrivi', 'grana'], verbi: ['stende', 'incornicia'], fonti: ['commons', 'rivista:Artribune'] },
  design: { int: ['misura', 'tessuto'], str: ['geometria', 'ripeti'], verbi: ['raddrizza', 'accosta', 'incornicia'], fonti: ['rivista:Artribune', 'wiki-en'] },
  pittura: { int: ['colore'], str: ['materia', 'fondo'], verbi: ['dipinge'], fonti: ['commons', 'wiki-it'] },
  scrittura: { int: ['parola'], str: ['scrivi', 'traccia'], verbi: ['scrive'], fonti: ['rivista:Il Tascabile', 'wikiquote'] },
  filosofia: { int: ['parola', 'cosmo'], str: ['scrivi'], verbi: ['scrive', 'proietta'], fonti: ['rivista:Doppiozero', 'wikisource'] },
  storia: { int: ['memoria'], str: ['togli', 'grana'], verbi: ['solleva', 'scrive'], fonti: ['wikisource', 'archive'] },
  politica: { int: ['chiacchiere', 'parola'], str: ['scrivi', 'taglia'], verbi: ['scrive', 'copre'], fonti: ['rivista:Il Post', 'rivista:Internazionale'] },
  attivismo: { int: ['rito', 'parola'], str: ['scrivi', 'taglia'], verbi: ['copre', 'scrive', 'incolla'], fonti: ['rivista:cheFare', 'rivista:Internazionale'] },
  editoria: { int: ['stampa', 'carta'], str: ['scrivi', 'ripeti'], verbi: ['incornicia', 'stende'], fonti: ['rivista:Il Tascabile', 'openlibrary'] },
  curatela: { int: ['memoria', 'colore'], str: ['ripeti'], verbi: ['sposta', 'accosta', 'gira', 'ingrandisce'], fonti: ['rivista:Artribune', 'rivista:Doppiozero'] },
  illuminotecnica: { int: ['luce'], str: ['luce', 'shader'], verbi: ['proietta'], fonti: ['wiki-en', 'arxiv'] },
  'musica e sound design': { int: ['rito'], str: ['ripeti', 'pattern'], verbi: ['stende'], fonti: ['wiki-en', 'archive'] },
  'illustrazione e stampa': { int: ['stampa', 'carta', 'colore'], str: ['traccia', 'grana', 'ricetta'], verbi: ['dipinge', 'stende'], fonti: ['commons', 'wiki-it'] },
  'texture e digitale': { int: ['tessuto', 'luce'], str: ['grana', 'pattern', 'schiaccia'], verbi: ['stende', 'incornicia'], fonti: ['wiki-en', 'commons'] },
  'codice e script': { int: ['misura', 'luce'], str: ['metashader', 'ricetta', 'shader'], verbi: ['stende', 'proietta'], fonti: ['wiki-en', 'arxiv'] },
  generatori: { int: ['crescita', 'cosmo'], str: ['albero', 'muffa', 'cristallo', 'universo', 'metashader'], verbi: ['semina', 'coltiva', 'stende'], fonti: ['arxiv', 'wiki-en'] },
  astrologia: { int: ['cosmo', 'rito'], str: ['fotocosmo', 'universo'], verbi: ['proietta', 'scrive'], fonti: ['wiki-it', 'wikisource'] },
  astronomia: { int: ['cosmo'], str: ['universo', 'fotocosmo'], verbi: ['proietta', 'stende'], fonti: ['arxiv', 'rivista:Le Scienze'] },
  'matematica e fisica': { int: ['misura', 'cosmo'], str: ['geometria', 'cristallo', 'acqua'], verbi: ['solleva', 'raddrizza'], fonti: ['arxiv', 'rivista:Scienza in Rete'] },
  letteratura: { int: ['parola', 'memoria'], str: ['scrivi'], verbi: ['scrive'], fonti: ['gutenberg', 'wikisource'] },
  lotta: { int: ['rito', 'parola'], str: ['taglia', 'scrivi'], verbi: ['copre', 'scrive'], fonti: ['rivista:Internazionale', 'rivista:minima&moralia'] },
  incisione: { int: ['stampa', 'carta'], str: ['traccia', 'grana', 'togli'], verbi: ['scrive', 'stende'], fonti: ['commons', 'wiki-it'] },
  'plastica ornamentale': { int: ['misura', 'terra'], str: ['geometria', 'ripeti', 'schiaccia'], verbi: ['solleva', 'stende'], fonti: ['commons', 'wiki-it'] },
  decorazione: { int: ['colore', 'tessuto'], str: ['pattern', 'ripeti', 'geometria'], verbi: ['stende', 'incornicia', 'dipinge'], fonti: ['commons', 'archive'] },
  "storia dell'arte": { int: ['memoria', 'colore'], str: ['grana', 'ripeti'], verbi: ['solleva', 'accosta', 'scrive'], fonti: ['wiki-it', 'commons', 'rivista:Artribune'] },
  controculture: { int: ['carta', 'rito', 'colore'], str: ['taglia', 'schiaccia', 'grana'], verbi: ['incolla', 'copre'], fonti: ['rivista:minima&moralia', 'archive'] },
}
function saperiDi(a: Abitante, r: () => number): Record<string, number> {
  const w: Record<string, number> = Object.fromEntries(Object.keys(SAPERI).map(k => [k, 0.4]))
  const id = a.id, add = (k: string, x: number) => { w[k] = (w[k] ?? 0) + x }
  if (/ritagli/.test(id)) { add('controculture', 2); add('illustrazione e stampa', 1) } if (/tipograf|stampat/.test(id)) { add('illustrazione e stampa', 2); add('editoria', 1.5); add('grafica', 1) }
  if (/redattor/.test(id)) { add('editoria', 2); add('scrittura', 1.5) } if (/ottic/.test(id)) { add('illuminotecnica', 2.5); add('matematica e fisica', 1) } if (/giardin/.test(id)) { add('generatori', 2); add('architettura', 0.5) }
  if (/geometr/.test(id)) { add('plastica ornamentale', 1); add('architettura', 2); add('matematica e fisica', 1.5) } if (/alchimi|chimic/.test(id)) { add('matematica e fisica', 1.5); add('pittura', 1) } if (/astron|astrofis/.test(id)) { add('astronomia', 3); add('astrologia', 0.4) }
  if (/filosof/.test(id)) { add('filosofia', 3); add('storia', 0.8) } if (id === 'urbanista') { add('architettura', 2.5); add('politica', 1) } if (id === 'curatore') { add('curatela', 3); add('design', 1); add("storia dell'arte", 1.5) } if (id === 'archivio') { add('storia', 2.5); add('letteratura', 1.5) } if (id === 'saggista') { add('scrittura', 2); add('filosofia', 1) }
  for (const k of Object.keys(a.interessi)) { if (/govern|polit|lavor|lott/.test(k)) { add('politica', 1); add('lotta', 0.8); add('attivismo', 0.6) } if (/stori|tempo|memor/.test(k)) add('storia', 1); if (/citt|spaz/.test(k)) add('architettura', 1); if (/simbol|segn/.test(k)) { add('grafica', 0.8); add('astrologia', 0.4) } }
  const c = a.carattere; add('decorazione', 0.4 + c.malinconico * 0.5); add('controculture', c.contrario); add('lotta', c.contrario * 0.6 + c.trascinatore * 0.4); add('musica e sound design', c.trascinatore * 0.8); add('letteratura', c.malinconico); add('codice e script', c.visionario * 0.6); add('generatori', c.visionario * 0.6)
  const out: Record<string, number> = {}, keys = Object.keys(w), n = 3 + Math.floor(r() * 3)
  while (Object.keys(out).length < n) { const tot = keys.reduce((t, k) => t + (out[k] ? 0 : w[k]), 0); let x = r() * tot; for (const k of keys) { if (out[k]) continue; x -= w[k]; if (x <= 0) { out[k] = +(0.3 + r() * 0.6).toFixed(2); break } } }
  return out
}


// ── volere proprio quella cosa: i motivi che si possono leggere, e come si fanno (la ricetta coi nostri generatori) ──
// Chi legge di un motivo e ha il sapere per desiderarlo vuole farlo davvero: cerca come si fa, ragiona sul generatore con
// chi sa di codice, chiede all'officina di costruirlo, poi lo usa su una superficie e lo porta in bottega.
export const MOTIVI: Record<string, { str: string[]; famiglia: string; parole: RegExp }> = {
  'meandro greco': { str: ['geometria', 'ripeti'], famiglia: 'geometria', parole: /meandr|greca\b|greche/ },
  "girali d'acanto": { str: ['albero', 'ripeti', 'traccia'], famiglia: 'albero', parole: /acanto|girali|tralci/ },
  intreccio: { str: ['pattern', 'traccia', 'ripeti'], famiglia: 'pattern', parole: /intrecc|nodo celtico|celtic/ },
  arabesco: { str: ['traccia', 'pattern', 'ripeti'], famiglia: 'traccia', parole: /arabesc|moresc/ },
  guilloché: { str: ['geometria', 'pattern', 'metashader'], famiglia: 'geometria', parole: /guilloch|banconot/ },
  rosone: { str: ['geometria', 'ripeti', 'luce'], famiglia: 'geometria', parole: /rosone|rosa dei venti|vetrat/ },
  damasco: { str: ['pattern', 'ripeti', 'materia'], famiglia: 'pattern', parole: /damasc|broccat/ },
  'pied-de-poule': { str: ['pattern', 'ripeti'], famiglia: 'pattern', parole: /pied|tartan|scozzes|tessut/ },
  cosmatesco: { str: ['geometria', 'taglia', 'ripeti'], famiglia: 'geometria', parole: /cosmat|mosaic|tessere/ },
  marmorizzato: { str: ['acqua', 'materia', 'shader'], famiglia: 'acqua', parole: /marmo|marmor|carta marmor/ },
  'reazione-diffusione': { str: ['muffa', 'shader', 'metashader'], famiglia: 'muffa', parole: /turing|reazion|macchie|leopard|zebra/ },
  voronoi: { str: ['cristallo', 'geometria', 'metashader'], famiglia: 'cristallo', parole: /voronoi|cellul|alveare|celle/ },
  frattale: { str: ['metashader', 'albero', 'shader'], famiglia: 'shader', parole: /frattal|mandelbrot|autosimil/ },
  moiré: { str: ['pattern', 'luce', 'shader'], famiglia: 'pattern', parole: /moir|interferen|onde/ },
  labirinto: { str: ['geometria', 'traccia'], famiglia: 'geometria', parole: /labirint|dedalo/ },
  spirale: { str: ['geometria', 'albero', 'shader'], famiglia: 'albero', parole: /spiral|chiocciol|vortic/ },
  'xilografia a sgorbia': { str: ['traccia', 'togli', 'grana'], famiglia: 'traccia', parole: /xilograf|sgorbi|incision|acquafort/ },
  stucco: { str: ['materia', 'schiaccia', 'geometria'], famiglia: 'materia', parole: /stucc|cornicion|bassoriliev/ },
}
const VUOLE_MOTIVI = ['decorazione', 'plastica ornamentale', 'incisione', "storia dell'arte", 'grafica', 'design', 'illustrazione e stampa', 'texture e digitale', 'pittura']
function motivoIn(testo: string): string | null { const t = testo.toLowerCase(); for (const [k, M] of Object.entries(MOTIVI)) if (M.parole.test(t) || t.includes(k)) return k; return null }

// ── i gesti: tutto il laboratorio, a tutti. Ognuno ha in mano gli stessi strumenti di Andrea (i generatori del software
// di grafica, i simulatori di stateyour, i filtri) e può usarli su qualunque superficie, che diventa il piano d'appoggio:
// una tavola, l'aria (un piano nuovo), un muro, il suolo, le cornici. Chiunque può anche sistemare quello che c'è:
// spostare, girare, accostare, raddrizzare, ingrandire. Nessun ruolo fisso: decidono il carattere, le voglie, gli
// argomenti e quello che trovano dove sono. Ogni gesto ha la sua frase (verbo, strumento, filtro, supporto, perché).
export const STRUMENTI: Record<string, string> = { ...Object.fromEntries(Object.keys(MOTIVI).map(k => ['motivo:' + k, `il motivo «${k}» che abbiamo costruito`])), semina: 'semi di forme', materia: 'materia', luce: 'luce', geometria: 'geometrie', pattern: 'un motivo', traccia: 'tracce a mano', scrivi: 'parole', grana: 'grana', taglia: 'tagli netti', ripeti: 'ripetizioni', togli: 'sottrazioni', fondo: 'un fondo', shader: 'uno shader', schiaccia: 'compressioni', ricetta: 'una ricetta dello studio', muffa: 'la muffa', albero: "il simulatore dell'albero", cristallo: 'il cristallo', acqua: "l'acqua", universo: 'un universo di stateyour', fotocosmo: 'una foto del cosmo', metashader: 'un generatore di generatori', tettonica: 'le placche di stateyour' }
export const FILTRI_V = ['Risograph', 'DuotoneFilter', 'HolographicFilter', 'EliteHalftone', 'DitheringFilter', 'FiberFilter', 'GrainFilter', 'PosterizeFilter', 'OilPaintFilter', 'OutlineFilter', 'PixelateFilter', 'PrismFilter', 'BloomFilter', 'WavyFilter', 'Glitch', 'VHSFilter', 'ASCIIFilter', 'NeonGlowFilter', 'ThermalFilter', 'LiquidMetalFilter']
const filtroDetto = (f: string) => f.replace(/Filter$/, '').replace(/^Elite/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
type Supporto = 'tavola' | 'aria' | 'muro' | 'suolo' | 'cornici' | 'sala'
type Verbo = { passato: string; su: Supporto[]; strumento: boolean }
export const VERBI: Record<string, Verbo> = {
  dipinge: { passato: 'dipinto', su: ['suolo', 'aria', 'muro'], strumento: true }, stende: { passato: 'steso', su: ['suolo', 'aria'], strumento: true },
  proietta: { passato: 'proiettato', su: ['tavola', 'aria'], strumento: true }, incolla: { passato: 'incollato', su: ['tavola', 'muro', 'aria'], strumento: false },
  scrive: { passato: 'scritto', su: ['tavola', 'aria', 'muro', 'suolo'], strumento: false }, copre: { passato: 'coperto', su: ['muro'], strumento: true },
  solleva: { passato: 'sollevato in rilievo', su: ['tavola'], strumento: false }, incornicia: { passato: 'colorato le cornici', su: ['cornici'], strumento: false },
  semina: { passato: 'seminato', su: ['suolo'], strumento: true }, coltiva: { passato: 'fatto crescere', su: ['suolo'], strumento: true },
  sposta: { passato: 'spostato', su: ['sala'], strumento: false }, gira: { passato: 'girato', su: ['sala'], strumento: false }, accosta: { passato: 'accostato', su: ['sala'], strumento: false },
  raddrizza: { passato: 'raddrizzato', su: ['sala'], strumento: false }, ingrandisce: { passato: 'ingrandito', su: ['sala'], strumento: false },
}
export type Gesto = { chi: string; verbo: string; strumento?: string; filtro?: string; supporto: Supporto; luogo: string; q?: number; x: number; y: number; parola?: string; colore: string; testo: string; h: number }
// cosa tira verso cosa: gli interessi verso strumenti e verbi (preferenze, non ruoli)
const INT_STR: Partial<Record<Interesse, string[]>> = { carta: ['taglia', 'ripeti'], stampa: ['pattern', 'grana', 'ricetta'], colore: ['materia', 'fondo', 'shader'], luce: ['luce', 'shader', 'metashader'], crescita: ['albero', 'muffa', 'semina', 'cristallo'], terra: ['tettonica', 'materia', 'fondo'], cosmo: ['universo', 'fotocosmo', 'acqua'], parola: ['scrivi', 'traccia'], misura: ['geometria', 'disponi' as string, 'cristallo'], tessuto: ['pattern', 'ripeti'], memoria: ['togli', 'schiaccia', 'grana'], cammino: ['traccia', 'acqua'] }
const INT_VERBO: Partial<Record<Interesse, string[]>> = { carta: ['incolla'], stampa: ['stende', 'incornicia'], colore: ['dipinge'], luce: ['proietta'], crescita: ['semina', 'coltiva'], terra: ['stende', 'solleva'], cosmo: ['proietta', 'stende'], parola: ['scrive'], misura: ['solleva', 'raddrizza', 'accosta'], tessuto: ['incornicia', 'stende'], memoria: ['scrive', 'solleva', 'raddrizza'], cammino: ['semina', 'scrive'] }
const SUPP_DETTO = (s: Supporto, L: Luogo) => ({ tavola: `su una tavola, ${a_(L.nome)}`, aria: `su un piano nuovo, sospeso ${a_(L.nome)}`, muro: `sul muro, ${a_(L.nome)}`, suolo: `per terra, ${a_(L.nome)}`, cornici: `delle tavole, ${a_(L.nome)}`, sala: `le tavole, ${a_(L.nome)}` })[s]
function gesto(V: Vita, C: Citta, T: Territorio, a: Abitante, L: Luogo, h: number, r: () => number, affollato: number): Gesto | null {
  const v = V.ab[a.id], ch = a.carattere, w: Record<string, number> = {}
  for (const k of Object.keys(VERBI)) w[k] = 0.3
  for (const [i, x] of Object.entries(v.interessi) as [Interesse, number][]) for (const k of INT_VERBO[i] ?? []) w[k] += x * 1.2 + (v.voglia[i] ?? 0)
  for (const [k, x] of Object.entries(v.saperi ?? {})) for (const vb of SAPERI[k]?.verbi ?? []) w[vb] = (w[vb] ?? 0.3) + x * 1.4
  w.copre += ch.contrario * 1.5; w.incolla += ch.contrario + ch.ironico * 0.6; w.proietta += ch.visionario; w.stende += ch.visionario * 0.8; w.semina += ch.visionario * 0.4
  w.scrive += ch.malinconico + ch.ironico * 0.5; w.solleva += ch.malinconico * 0.6; w.dipinge += ch.trascinatore
  // il disordine chiama chi mette ordine (o chi ha voglia di cambiare la stanza)
  for (const k of ['sposta', 'gira', 'accosta', 'raddrizza', 'ingrandisce']) w[k] += (affollato > 6 ? 1 : 0.15) * (0.4 + ch.prudente * 1.2 + ch.visionario * 0.3)
  const possibili = Object.keys(VERBI).filter(k => VERBI[k].su.some(s => s !== 'sala' || L.tipo === 'sala') && !(L.tipo !== 'sala' && VERBI[k].su.every(s => s === 'tavola' || s === 'cornici' || s === 'sala')))
  if (!possibili.length) return null
  let roll = r() * possibili.reduce((t, k) => t + w[k], 0), verbo = possibili[0]; for (const k of possibili) { roll -= w[k]; if (roll <= 0) { verbo = k; break } }
  const VB = VERBI[verbo], sups = VB.su.filter(s => (s === 'sala' || s === 'tavola' || s === 'cornici') ? L.tipo === 'sala' : true), supporto = sups[Math.floor(r() * sups.length)] ?? 'suolo'
  let strumento: string | undefined
  if (VB.strumento) { const pref = [...(Object.keys(v.interessi) as Interesse[]).flatMap(i => INT_STR[i] ?? []), ...Object.keys(v.saperi ?? {}).flatMap(k => SAPERI[k]?.str ?? []), ...Object.keys(v.saperi ?? {}).flatMap(k => SAPERI[k]?.str ?? [])].filter(x => STRUMENTI[x]), mie = Object.keys(a.interessi).filter(k => k.startsWith('m:')).map(k => k.slice(2)).filter(x => STRUMENTI[x])
    const tutti = Object.keys(STRUMENTI); strumento = (v.costruiti?.length && r() < 0.3) ? 'motivo:' + pick(r, v.costruiti) : r() < 0.55 && pref.length ? pick(r, pref) : r() < 0.5 && mie.length ? pick(r, mie) : pick(r, tutti) } // a volte la cosa che non ha mai usato
  const filtro = VB.strumento && r() < 0.45 + ch.visionario * 0.2 ? pick(r, FILTRI_V) : undefined
  const arg = Object.entries(v.argomenti).sort((x, y) => y[1] - x[1])[Math.floor(r() * 2)]?.[0]
  const q = L.q ?? qDi(C, T, a, L.id), colore = PALETTE[Math.floor(r() * PALETTE.length)]
  const cosa = strumento ? ` ${STRUMENTI[strumento]}` : verbo === 'scrive' ? ` «${arg ?? pick(r, T.quartieri.find(x => x.id === q)?.concetti ?? ['qui'])}»` : verbo === 'incolla' ? ' un ritaglio di un\'altra zona' : ''
  const testo = verbo === 'copre' ? `Ho coperto il muro, ${a_(L.nome)}, con${cosa}${filtro ? `, passato ${filtro === 'Risograph' ? 'al risograph' : `col filtro ${filtroDetto(filtro)}`}` : ''}${arg ? `, pensando a «${arg}»` : ''}. Sotto c'è ancora tutto.` : `Ho ${VB.passato}${cosa} ${SUPP_DETTO(supporto, L)}${filtro ? `, passato ${filtro === 'Risograph' ? 'al risograph' : `col filtro ${filtroDetto(filtro)}`}` : ''}${arg && verbo !== 'scrive' ? `, pensando a «${arg}»` : ''}.`
  // il sapere che ha usato cresce (e ogni tanto ne nasce uno nuovo, dalla cosa che ha provato)
  for (const [k, S] of Object.entries(SAPERI)) if ((strumento && S.str.includes(strumento)) || S.verbi.includes(verbo)) { if (v.saperi[k] != null) v.saperi[k] = Math.min(1, v.saperi[k] + 0.01); else if (r() < 0.03) v.saperi[k] = 0.1 }
  return { chi: a.id, verbo, strumento, filtro, supporto, luogo: L.id, q, x: L.x + (r() - 0.5) * 24, y: L.y + (r() - 0.5) * 24, parola: arg, colore, testo, h }
}

// ── il popolo: come a Porto Vecchio, la città è abitata da molti (almeno cento). Oltre alle figure che discutono in
// piazza ci sono apprendisti, artigiani, lettori, giardinieri, ognuno con il suo nome, carattere, saperi e vestiti.
const NOMI_M = ['Antonio', 'Giovanni', 'Salvatore', 'Efisio', 'Gavino', 'Bachisio', 'Mario', 'Nino', 'Tore', 'Piero', 'Lino', 'Aldo', 'Ettore', 'Gino', 'Renzo', 'Ugo', 'Dario', 'Elio', 'Sandro', 'Bruno', 'Ivo', 'Marco', 'Tito', 'Oreste']
const NOMI_F = ['Maria', 'Giovanna', 'Anna', 'Rosaria', 'Tina', 'Lella', 'Pina', 'Bonaria', 'Grazia', 'Ada', 'Iris', 'Nora', 'Elsa', 'Luce', 'Marta', 'Rosa', 'Vera', 'Bice', 'Zita', 'Olga', 'Irene', 'Lia', 'Teresa', 'Dora']
const SOPRANNOMI = ['il Rosso', 'Mezzalingua', 'Zampa', 'il Muto', 'Tredici', 'Gattone', 'Lampo', 'la Gazza', 'Matita', 'Pennino', 'Retino', 'Fumo', 'Spago', 'Colla', 'Bussola', 'Lente', 'Inchiostro', 'Cometa', 'Ruggine', 'Vetro']
export function popola(V: Vita, C: Citta, T: Territorio, r: () => number, quanti = 100) {
  V.popolo ??= []
  const manca = quanti - C.abitanti.length - V.popolo.length; if (manca <= 0) return
  for (let i = 0; i < manca; i++) {
    const fem = r() < 0.5, nome = pick(r, fem ? NOMI_F : NOMI_M), sop = r() < 0.35 ? ' ' + pick(r, SOPRANNOMI) : '', id = `c${V.popolo.length}-${nome.toLowerCase()}`
    const Q = pick(r, T.quartieri), c = () => r() * 0.9, car = { credulone: c(), testardo: c(), contrario: c() * 0.8, prudente: c(), trascinatore: c(), ironico: c(), malinconico: c(), visionario: c() }
    const a: Abitante = { id, nome: nome + sop, tipo: 'cittadino' as Abitante['tipo'], carica: 'cittadino', carattere: car, interessi: Object.fromEntries((Q?.concetti ?? []).slice(0, 2).map(w => [radice(w) ?? w, 0.6])), casa: { x: (Q?.x ?? T.piazza.x) + (r() - 0.5) * 60, y: (Q?.y ?? T.piazza.y) + (r() - 0.5) * 60 }, raggio: 80, cella: 'casa', tensione: 0, peso: {}, storia: [], visti: [] }
    const vs = vestitoDi({ id, nome: a.nome, tipo: 'mestiere', carattere: car as unknown as Record<string, number>, fem }, r); a.vesti = vs.vesti; a.fem = fem
    V.popolo.push(a); adotta(V, a, r)
    const sp = Object.entries(V.ab[id].saperi).sort((x, y) => y[1] - x[1])[0]?.[0]; if (sp) a.carica = `${fem ? 'apprendista' : 'apprendista'} di ${sp}`
    V.luoghi.push({ id: 'casa:' + id, tipo: 'casa', nome: `la casa di ${a.nome}`, x: a.casa.x, y: a.casa.y, chi: id })
  }
}

// ── fondazione: i luoghi comuni attorno alla piazza, le case, le sale, i confini, le strade ──────────────────
function fondaLuoghi(C: Citta, T: Territorio, r: () => number): Luogo[] {
  const P = T.piazza, L: Luogo[] = [{ id: 'piazza', tipo: 'piazza', nome: 'la piazza', x: P.x, y: P.y }]
  const comuni: [string, string][] = [['mensa', 'la mensa'], ['biblioteca', 'la biblioteca'], ['bottega', 'la bottega'], ['officina', "l'officina"], ['osservatorio', "l'osservatorio"], ['archivio', "l'archivio"], ['assemblea', "l'assemblea"], ['guardaroba', 'il guardaroba'], ['fontana', 'la fontana'], ['giardino', "l'orto comune"]]
  // a spirale aurea attorno alla piazza: nessuno sta sopra un altro, e le distanze crescono piano
  comuni.forEach(([id, nome], i) => { const a = i * 2.39996 + r() * 0.3, d = 34 + 11 * Math.sqrt(i + 1) * 3 + r() * 10; L.push({ id, tipo: id, nome, x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d }) })
  for (const a of C.abitanti) { const c = a.casa ?? P, ang = r() * Math.PI * 2, d = a.casa === P || (Math.abs(c.x - P.x) < 1 && Math.abs(c.y - P.y) < 1) ? 60 + r() * 50 : 8 + r() * 14; L.push({ id: 'casa:' + a.id, tipo: 'casa', nome: `la casa di ${a.nome}`, x: c.x + Math.cos(ang) * d, y: c.y + Math.sin(ang) * d, chi: a.id }) }
  for (const Q of T.quartieri) L.push({ id: 'sala:' + Q.id, tipo: 'sala', nome: `la sala «${Q.nome}»`, x: Q.x, y: Q.y, q: Q.id })
  // i confini: dove due quartieri molto legati si toccano
  const legami = new Map<string, number>()
  for (const [a, b, w] of T.fili) { const qa = T.punti[a]?.q, qb = T.punti[b]?.q; if (qa == null || qb == null || qa === qb) continue; const k = qa < qb ? `${qa}|${qb}` : `${qb}|${qa}`; legami.set(k, (legami.get(k) ?? 0) + w) }
  for (const [k] of [...legami.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    const [qa, qb] = k.split('|').map(Number), A = T.quartieri.find(q => q.id === qa), B = T.quartieri.find(q => q.id === qb); if (!A || !B) continue
    L.push({ id: `confine:${k}`, tipo: 'confine', nome: `il confine tra «${A.nome}» e «${B.nome}»`, x: (A.x + B.x) / 2 + (r() - 0.5) * 12, y: (A.y + B.y) / 2 + (r() - 0.5) * 12 })
  }
  // le strade: un muro e un sentiero a metà strada tra la piazza e ogni sala grande
  for (const Q of [...T.quartieri].sort((a, b) => b.n - a.n).slice(0, 10)) L.push({ id: 'strada:' + Q.id, tipo: 'strada', nome: `la strada per «${Q.nome}»`, x: (P.x + Q.x) / 2 + (r() - 0.5) * 20, y: (P.y + Q.y) / 2 + (r() - 0.5) * 20, q: Q.id })
  return L
}

// gli interessi d'arte di un abitante: dal mestiere, dalla testa, dal carattere (come interestsFor a Porto Vecchio)
function interessiDi(a: Abitante, r: () => number): Partial<Record<Interesse, number>> {
  const w: Record<Interesse, number> = { carta: 0.6, stampa: 0.5, colore: 0.8, luce: 0.4, crescita: 0.6, terra: 0.4, cosmo: 0.4, parola: 0.7, misura: 0.4, tessuto: 0.4, memoria: 0.5, chiacchiere: 1, cucina: 0.6, cammino: 0.8, rito: 0.5 }
  const id = a.id
  if (/ritagli/.test(id)) w.carta += 2; if (/tipograf|stampat/.test(id)) w.stampa += 2; if (/redattor/.test(id)) w.parola += 2
  if (/ottic/.test(id)) w.luce += 2; if (/giardin/.test(id)) w.crescita += 2; if (/geometr/.test(id)) w.misura += 2; if (/alchimi|chimic/.test(id)) { w.colore += 1; w.terra += 1 }
  if (/astron|astrofis/.test(id)) w.cosmo += 2.5; if (/filosof/.test(id)) { w.parola += 1; w.cosmo += 0.8 }
  if (a.tipo === 'testa') { w.parola += 1.2; w.memoria += 0.6; w.cammino += 0.5 }
  if (id === 'archivio') w.memoria += 3; if (id === 'urbanista') { w.misura += 1.5; w.cammino += 1 } if (id === 'curatore') { w.colore += 1; w.rito += 0.8 } if (id === 'saggista') w.parola += 1.5
  const ch = a.carattere; w.rito += ch.trascinatore; w.chiacchiere += ch.trascinatore * 0.8 - ch.malinconico * 0.4; w.memoria += ch.malinconico; w.cosmo += ch.visionario * 0.6; w.terra += ch.testardo * 0.4
  const out: Partial<Record<Interesse, number>> = {}, keys = Object.keys(w) as Interesse[], k = 3 + (r() < 0.4 ? 1 : 0)
  while (Object.keys(out).length < k) { const tot = keys.reduce((s, x) => s + (out[x] ? 0 : w[x]), 0); let roll = r() * tot; for (const x of keys) { if (out[x]) continue; roll -= w[x]; if (roll <= 0) { out[x] = 0.5 + r() * 0.5; break } } }
  return out
}

export function fondaVita(C: Citta, T: Territorio, r: () => number): Vita {
  const V: Vita = { luoghi: fondaLuoghi(C, T, r), ab: {}, tracce: [], vie: {}, giorno: C.giorno, cronaca: [] }
  for (const a of C.abitanti) adotta(V, a, r)
  return V
}
function adotta(V: Vita, a: Abitante, r: () => number) {
  if (V.ab[a.id]) { V.ab[a.id].argomenti ??= {}; if (!V.ab[a.id].saperi) seminaSaperi(V.ab[a.id], a, r); return }
  const bis = Object.fromEntries(BISOGNI.map(b => [b, b === 'materiali' ? 0.3 : r() * 0.4])) as Record<Bisogno, number>
  const interessi = interessiDi(a, r)
  V.ab[a.id] = { bisogni: bis, interessi, voglia: Object.fromEntries(Object.keys(interessi).map(k => [k, r() * 0.5])), rel: {}, diario: [], progetti: [], evita: {}, fatte: {}, argomenti: {}, saperi: {} }
  seminaSaperi(V.ab[a.id], a, r)
}

// ── memoria (come note/keepWorthy a Porto Vecchio) ─────────────────────────────────────────────────────────
// i saperi entrano negli interessi e nelle letture (la tavolozza delle fonti si allarga verso quello che sa)
function seminaSaperi(v: VitaAb, a: Abitante, r: () => number) {
  v.saperi = saperiDi(a, r)
  for (const [k, x] of Object.entries(v.saperi)) { for (const i of SAPERI[k].int) v.interessi[i] = Math.max(v.interessi[i] ?? 0, 0.3 + x * 0.5); for (const f of SAPERI[k].fonti) { a.fonti ??= {}; a.fonti[f] = Math.max(a.fonti[f] ?? 0, 0.3 + x * 0.5) } }
  for (const i of Object.keys(v.interessi) as Interesse[]) v.voglia[i] ??= r() * 0.5
}
function nota(v: VitaAb, g: number, testo: string, tag: string, peso: number, chi?: string, dove?: string) {
  v.diario.push({ g, testo, peso, tag, chi, dove })
  if (v.diario.length > 30) { let k = 0, min = 1e9; v.diario.forEach((d, i) => { const s = d.peso / (1 + (g - d.g) * 0.3); if (s < min) { min = s; k = i } }); v.diario.splice(k, 1) }
}
const relDi = (v: VitaAb, id: string) => (v.rel[id] ??= { aff: 0, stima: 0, ore: 0, ultimo: 0, litigi: 0 })

// ── dove si fa: il lavoro di ciascuno (il suo posto nella città) ─────────────────────────────────────────────
function lavoroDi(V: Vita, C: Citta, a: Abitante): string {
  const sala = Object.entries(C.sale ?? {}).find(([, s]) => s.curatore === a.id)?.[0]
  if (a.tipo === 'scienziato') return a.id === 'filosofa' ? 'biblioteca' : 'osservatorio'
  if (a.id === 'archivio') return 'archivio'; if (a.id === 'saggista') return 'biblioteca'; if (a.id === 'urbanista') return pick(() => 0.5, V.luoghi.filter(l => l.tipo === 'strada')).id
  if (a.id === 'curatore') return sala ? 'sala:' + sala : 'assemblea'
  if (a.tipo === 'testa') return 'biblioteca'
  if (/ottic|geometr/.test(a.id)) return 'officina'; if (/giardin/.test(a.id)) return 'giardino'
  return sala ? 'sala:' + sala : 'bottega'
}
const luogoDi = (V: Vita, id: string) => V.luoghi.find(l => l.id === id)
function oggettiIn(V: Vita, luogo: string, h: number, gs: number, v: VitaAb): string[] {
  const L = luogoDi(V, luogo); if (!L) return []
  return Object.entries(OGG).filter(([, o]) => o.dove.includes(L.tipo) && (!o.h || (h >= o.h[0] && h < o.h[1])) && (!o.giorni || o.giorni.includes(gs)) && (!o.costo || v.bisogni.materiali < 0.95)).map(([k]) => k)
}

// ── la giornata in blocchi (planDay): sonno, lavoro, pasti, svago per interesse, passi dei progetti ─────────
const ORA_FASE: Record<string, number> = { piazza: 10, biblioteca: 11, osservatorio: 21, bottega: 15, assemblea: 18, archivio: 22 }
const OGG_FASE: Record<string, string> = { piazza: 'panchina', biblioteca: 'leggio', osservatorio: 'telescopio', bottega: 'forbici', assemblea: 'palco', archivio: 'scaffali' }
const PERCHE_FASE: Record<string, string> = { piazza: 'discute in piazza', biblioteca: 'cerca e legge', osservatorio: 'misura i mondi', bottega: 'prova tavole in bottega', assemblea: "è all'assemblea", archivio: "mette in ordine l'archivio" }
let fasiOggi = new Map<string, string[]>()
function pianifica(V: Vita, C: Citta, a: Abitante, r: () => number): Blocco[] {
  const v = V.ab[a.id], casa = 'casa:' + a.id, lav = lavoroDi(V, C, a), ch = a.carattere
  const sveglia = 6 + Math.round(ch.malinconico * 2 + r()), tardi = 22 + Math.round(ch.visionario * 2 + ch.trascinatore)
  const B: Blocco[] = [{ h0: 0, h1: sveglia, luogo: casa, ogg: 'letto', perche: 'dorme' }, { h0: sveglia, h1: sveglia + 1, luogo: casa, ogg: 'catino', perche: 'si prepara' }]
  B.push({ h0: sveglia + 1, h1: sveglia + 2, luogo: casa, ogg: 'cucina', perche: 'fa colazione' }, { h0: sveglia + 2, h1: 12, luogo: lav, perche: 'lavora' }, (() => { const m = r() < 0.6; return { h0: 12, h1: 13, luogo: m ? 'mensa' : casa, ogg: m ? 'tavolata' : 'cucina', perche: 'pranza' } })(), { h0: 13, h1: 17, luogo: lav, perche: 'lavora' })
  // lo svago: l'interesse con più voglia, nel posto dove si fa
  const svaghi = (Object.entries(v.voglia) as [Interesse, number][]).sort((x, y) => y[1] - x[1])
  for (const [h0, h1] of [[17, 19], [20, tardi]] as [number, number][]) {
    const [int] = svaghi[h0 === 17 ? 0 : Math.min(1, svaghi.length - 1)] ?? ['chiacchiere']
    const ogg = Object.entries(OGG).find(([, o]) => o.int === int && (!o.h || (o.h[0] <= h0 + 1 && o.h[1] >= h1 - 1)))
    const posti = ogg ? V.luoghi.filter(l => ogg[1].dove.includes(l.tipo) && !v.evita[l.id]) : []
    const L = posti.length ? posti.sort((x, y) => dist(x, luogoDi(V, lav)!) - dist(y, luogoDi(V, lav)!))[Math.floor(r() * Math.min(3, posti.length))] : luogoDi(V, 'piazza')!
    B.push({ h0, h1, luogo: L.id, ogg: ogg?.[0], perche: ogg ? `${OGG[ogg[0]].fa} (${INTERESSI[int]})` : 'passeggia' })
  }
  { const m = r() < 0.5; inserisci(B, { h0: 19, h1: 20, luogo: m ? 'mensa' : casa, ogg: m ? 'tavolata' : 'cucina', perche: 'cena' }) }
  B.push({ h0: tardi, h1: 24, luogo: casa, ogg: 'letto', perche: 'dorme' })
  // la vita della città degli agenti: le fasi in cui oggi ha avuto qualcosa da fare (piazza, biblioteca, bottega,
  // osservatorio, assemblea, archivio) sono ore della sua giornata, nel luogo dove succedono
  for (const f of fasiOggi.get(a.id) ?? []) { const h = ORA_FASE[f]; if (h != null && luogoDi(V, f)) inserisci(B, { h0: h, h1: h + 1, luogo: f, ogg: OGG_FASE[f], perche: PERCHE_FASE[f] }) }
  // la giornata non è un binario: ogni tanto segue un'idea e va dove la porta (la sala del suo argomento, un confine,
  // il posto dove ieri qualcuno ha lasciato qualcosa), per un'ora o due
  const fughe = Math.floor(r() * (1.5 + a.carattere.visionario * 2 + a.carattere.contrario))
  for (let k = 0; k < fughe; k++) { const h0 = 9 + Math.floor(r() * 11), arg = Object.entries(v.argomenti).sort((x, y) => y[1] - x[1])[0]?.[0]
    const per = r() < 0.4 && arg ? V.luoghi.find(l => l.tipo === 'sala' && l.nome.toLowerCase().includes(arg.slice(0, 5))) : null
    const recenti = V.tracce.filter(t => V.giorno - t.ultimo <= 1 && !t.luogo.startsWith('casa')), L = per ?? (recenti.length && r() < 0.5 ? luogoDi(V, pick(r, recenti).luogo) : pick(r, V.luoghi.filter(l => !['casa'].includes(l.tipo))))
    if (L) inserisci(B, { h0, h1: h0 + 1 + Math.floor(r() * 2), luogo: L.id, perche: per ? `segue «${arg}» fino ${a_(L.nome)}` : `segue un'idea fino ${a_(L.nome)}` }) }
  // i passi dei progetti: entrano al loro orario e spostano il resto
  for (const p of v.progetti.filter(p => p.stato === 'in corso')) { const s = p.passi.find(x => !x.fatto); if (!s) continue; s.oggi = V.giorno; inserisci(B, { h0: s.h, h1: s.h + 2, luogo: s.luogo, ogg: s.ogg, perche: s.label, con: s.chi, progetto: true }) }
  return B
}
function inserisci(B: Blocco[], n: Blocco) {
  for (let i = B.length - 1; i >= 0; i--) { const b = B[i]; if (b.h1 <= n.h0 || b.h0 >= n.h1) continue
    const prima = b.h0 < n.h0 ? { ...b, h1: n.h0 } : null, dopo = b.h1 > n.h1 ? { ...b, h0: n.h1 } : null
    B.splice(i, 1, ...[prima, dopo].filter(Boolean) as Blocco[]) }
  B.push(n); B.sort((x, y) => x.h0 - y.h0)
}
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

// ── l'urgenza (urge): un bisogno che scavalca il programma ──────────────────────────────────────────────────
const URGE: [Bisogno, number, string[]][] = [['sonno', 0.92, ['letto']], ['fame', 0.85, ['tavolata', 'cucina']], ['cura', 0.9, ['catino', 'fontana']], ['compagnia', 0.88, ['panchina', 'bancone']], ['rabbia', 0.8, ['muro', 'scavo', 'sentiero']], ['paura', 0.75, ['fontana', 'scaffali']], ['ispirazione', 0.9, ['leggio', 'sentiero', 'telescopio']], ['materiali', 0.9, ['mercato']]]

// ── la mente (reflect, di notte): dal diario, dai bisogni e dalle voglie nascono i progetti ─────────────────
type DefProg = { quando: (v: VitaAb, a: Abitante, V: Vita) => unknown; fa: (V: Vita, C: Citta, a: Abitante, v: VitaAb, r: () => number, arg: any) => Omit<Progetto, 'id' | 'dal' | 'stato'> | null }
const PROG: Record<string, DefProg> = {
  // una voglia trascurata da troppo diventa una serie: tre giorni allo stesso oggetto, poi l'opera
  serie: { quando: v => (Object.entries(v.voglia) as [Interesse, number][]).find(([, w]) => w > 0.9),
    fa: (V, C, a, v, r, [int]: [Interesse]) => { const [k, o] = Object.entries(OGG).find(([, o]) => o.int === int && o.traccia) ?? []; if (!k) return null
      const L = V.luoghi.filter(l => o!.dove.includes(l.tipo)); if (!L.length) return null; const dove = pick(r, L)
      return { tipo: 'serie', int, label: `una serie ${su(INTERESSI[int])}`, passi: [0, 1, 2].map(i => ({ k: 'go' as const, luogo: dove.id, h: 14 + i, ogg: k, label: `${o!.fa} per la serie (${i + 1}/3)` })) } } },
  // conoscere qualcuno (compagnia alta, pochi amici)
  conoscere: { quando: (v, a, V) => v.bisogni.compagnia > 0.6 && Object.values(v.rel).filter(x => x.aff > 0.35).length < 4,
    fa: (V, C, a, v, r) => { const altri = C.abitanti.filter(b => b.id !== a.id && (v.rel[b.id]?.aff ?? 0) < 0.2); if (!altri.length) return null; const b = pick(r, altri)
      return { tipo: 'conoscere', con: b.id, label: `conoscere ${b.nome}`, passi: [{ k: 'meet', chi: b.id, luogo: pick(r, ['mensa', 'piazza', 'fontana']), h: 18, ogg: 'panchina', label: `invita ${b.nome} a fare due chiacchiere` }] } } },
  // a più mani: con chi stima e condivide un interesse, un'opera insieme
  insieme: { quando: (v, a, V) => !v.progetti.some(p => p.tipo === 'insieme' && V.giorno - p.dal < 4) && (Object.entries(v.rel).filter(([id, x]) => x.stima > 0.3 && x.aff > 0.3 && V.ab[id]).map(([id]) => id)).find(id => Object.keys(V.ab[id].interessi).some(k => (v.interessi as Record<string, number>)[k] && !['chiacchiere', 'cucina', 'rito'].includes(k))),
    fa: (V, C, a, v, r, id: string) => { const b = C.abitanti.find(x => x.id === id); if (!b) return null; const int = Object.keys(V.ab[id].interessi).find(k => (v.interessi as Record<string, number>)[k] && !['chiacchiere', 'cucina', 'rito'].includes(k)) as Interesse; if (!int) return null
      const [k, o] = Object.entries(OGG).find(([, o]) => o.int === int && o.traccia) ?? Object.entries(OGG).find(([k]) => k === 'forbici')!
      const L = V.luoghi.filter(l => o.dove.includes(l.tipo)); if (!L.length) return null; const dove = pick(r, L)
      return { tipo: 'insieme', con: id, int, label: `un'opera a quattro mani con ${b.nome}`, passi: [{ k: 'meet', chi: id, luogo: dove.id, h: 15, ogg: k, label: `lavora con ${b.nome}: ${o.fa}` }, { k: 'meet', chi: id, luogo: dove.id, h: 15, ogg: k, label: `finisce l'opera con ${b.nome}` }] } } },
  // fare pace (dopo un litigio)
  pace: { quando: v => Object.entries(v.rel).find(([, x]) => x.litigi > 0 && x.aff < 0)?.[0],
    fa: (V, C, a, v, r, id: string) => { const b = C.abitanti.find(x => x.id === id); return b ? { tipo: 'pace', con: id, label: `fare pace con ${b.nome}`, passi: [{ k: 'meet', chi: id, luogo: 'mensa', h: 19, ogg: 'tavolata', label: `porta ${b.nome} a cena per fare pace` }] } : null } },
  // la rabbia che cerca una strada: un muro
  muro: { quando: (v, a) => v.bisogni.rabbia > 0.5 && a.carattere.contrario + a.carattere.testardo > 0.8,
    fa: (V, C, a, v, r) => { const L = V.luoghi.filter(l => l.tipo === 'strada'); return L.length ? { tipo: 'muro', label: 'lasciare un verso su un muro', passi: [{ k: 'go', luogo: pick(r, L).id, h: 21, ogg: 'muro', label: 'lascia un verso sul muro' }] } : null } },
  // un vestito nuovo, quando il guardaroba chiama
  vestito: { quando: v => (v.interessi.tessuto ?? 0) > 0.5 && (v.voglia.tessuto ?? 0) > 0.6,
    fa: () => ({ tipo: 'vestito', int: 'tessuto', label: 'farsi un capo nuovo', passi: [{ k: 'go', luogo: 'guardaroba', h: 10, ogg: 'telaio', label: 'tesse la stoffa' }, { k: 'go', luogo: 'guardaroba', h: 16, ogg: 'telaio', label: 'cuce il capo' }] }) },
  // un orto su un confine: dove due quartieri si toccano
  orto: { quando: v => (v.interessi.crescita ?? 0) > 0.4 && (v.voglia.crescita ?? 0) > 0.5,
    fa: (V, C, a, v, r) => { const L = V.luoghi.filter(l => l.tipo === 'confine'); return L.length ? (() => { const dove = pick(r, L); return { tipo: 'orto', int: 'crescita' as Interesse, label: `coltivare ${dove.nome}`, passi: [0, 1, 2, 3].map(i => ({ k: 'go' as const, luogo: dove.id, h: 7 + i % 2, ogg: 'orto', label: i ? 'torna a curare le piante' : 'vanga e semina' })) } })() : null } },
  // volere proprio quel motivo: cercare come si fa, ragionarci con chi sa di codice, farlo costruire in officina, usarlo
  ricreare: { quando: (v, a, V) => { if (!VUOLE_MOTIVI.some(k => (v.saperi?.[k] ?? 0) > 0.3)) return null; const m = v.letti?.find(x => !v.progetti.some(p => p.tipo === 'ricreare' && p.stato === 'in corso' && p.label.includes(x))); return m ?? null },
    fa: (V, C, a, v, r, motivo: string) => {
      const esperto = C.abitanti.filter(b => b.id !== a.id).map(b => [b, Math.max(V.ab[b.id]?.saperi?.['codice e script'] ?? 0, (V.ab[b.id]?.saperi?.generatori ?? 0) * 0.9)] as const).sort((x, y) => y[1] - x[1])[0]?.[0]
      const sup = pick(r, V.luoghi.filter(l => ['sala', 'confine', 'strada', 'piazza'].includes(l.tipo)))
      return { tipo: 'ricreare', int: 'colore', con: esperto?.id, label: `fare proprio il motivo «${motivo}»`, passi: [
        { k: 'go', luogo: 'biblioteca', h: 10, ogg: 'leggio', label: `cerca come si fa il motivo «${motivo}»` },
        ...(esperto ? [{ k: 'meet' as const, chi: esperto.id, luogo: 'officina', h: 15, ogg: 'banco', label: `ragiona sul generatore del motivo «${motivo}» con ${esperto.nome}` }] : []),
        { k: 'go', luogo: 'officina', h: 11, ogg: 'banco', label: `costruisce il motivo «${motivo}» in officina` },
        { k: 'go', luogo: sup.id, h: 16, ogg: 'cavalletto', label: `prova il motivo «${motivo}» ${a_(sup.nome)}` }] } } },
  // fare festa (il trascinatore, a fine settimana)
  festa: { quando: (v, a, V) => a.carattere.trascinatore > 0.6 && V.giorno % 7 >= 4 && v.bisogni.svago > 0.5,
    fa: () => ({ tipo: 'festa', int: 'rito', label: 'organizzare una festa', passi: [{ k: 'go', luogo: 'assemblea', h: 21, ogg: 'palco', label: 'monta il palco e chiama tutti' }] }) },
}
function rifletti(V: Vita, C: Citta, a: Abitante, r: () => number, verbale: Battuta[]) {
  const v = V.ab[a.id]
  // i posti da evitare: dove è successo qualcosa di brutto negli ultimi giorni
  for (const k of Object.keys(v.evita)) if (--v.evita[k] <= 0) delete v.evita[k]
  for (const d of v.diario.filter(d => d.g >= V.giorno - 1 && d.peso < -0.5 && d.dove)) v.evita[d.dove!] = 3
  // i progetti vecchi scadono
  for (const p of v.progetti) if (p.stato === 'in corso' && V.giorno - p.dal > 6) { p.stato = 'scaduto'; nota(v, V.giorno, `ho lasciato perdere: ${p.label}`, 'progetto', -0.2) }
  v.progetti = v.progetti.filter(p => p.stato === 'in corso' || V.giorno - p.dal < 10).slice(-8)
  if (v.progetti.filter(p => p.stato === 'in corso').length >= 2) return
  const cand = Object.entries(PROG).map(([k, d]) => [k, d, d.quando(v, a, V)] as const).filter(([k, , arg]) => arg && !v.progetti.some(p => p.tipo === k && p.stato === 'in corso'))
  if (!cand.length) return
  const scelto = cand.find(([k]) => k === 'ricreare') ?? cand[Math.floor(r() * cand.length)], [k, d, arg] = scelto, p = d.fa(V, C, a, v, r, arg); if (!p) return
  v.progetti.push({ ...p, id: `${a.id}-${V.giorno}-${k}`, dal: V.giorno, stato: 'in corso' })
  v.pensiero = `Stanotte ho deciso: ${p.label}.`
  verbale.push({ fase: 'casa' as Cella, chi: a.id, tipo: 'progetto', testo: v.pensiero })
}

// ── la giornata, ora per ora ─────────────────────────────────────────────────────────────────────────────
export function viviGiornata(C: Citta & { vita?: Vita }, T: Territorio, r: () => number, verbale: Battuta[], tavolozzaDi: (id: string) => string[] = () => PALETTE): string[] {
  const V = C.vita ??= fondaVita(C, T, r)
  popola(V, C, T, r)
  const veri = C.abitanti; C.abitanti = [...veri, ...(V.popolo ?? [])]
  try {
  // chi è nato nel frattempo entra nella vita; i luoghi mancanti (quartieri nuovi) si aggiungono
  for (const a of C.abitanti) adotta(V, a, r)
  for (const Q of T.quartieri) if (!V.luoghi.some(l => l.id === 'sala:' + Q.id)) V.luoghi.push({ id: 'sala:' + Q.id, tipo: 'sala', nome: `la sala «${Q.nome}»`, x: Q.x, y: Q.y, q: Q.id })
  V.giorno = C.giorno
  const gs = C.giorno % 7, detti: string[] = [], nomeDi = (id: string) => C.abitanti.find(a => a.id === id)?.nome ?? id
  const parla = (chi: string, testo: string, fase: Cella = 'piazza') => { verbale.push({ fase, chi, tipo: 'vita', testo }); detti.push(testo) }
  fasiOggi = new Map(); for (const b of verbale) { if (!b.chi || !(b.fase in ORA_FASE)) continue; const l = fasiOggi.get(b.chi) ?? []; if (!l.includes(b.fase)) l.push(b.fase); fasiOggi.set(b.chi, l) }
  // le notizie di fuori: quello che è stato letto oggi sulle riviste e nelle enciclopedie
  for (const b of verbale) if (b.tipo === 'legge') { const m = b.testo.match(/«([^»]+)» \(([^)]+)\)/); if (m && !/wiki|commons|gutenberg|archive|openlibrary|arxiv|source|zionario|quote/i.test(m[2]) && !(V.fuori ??= []).some(f => f.t === m[1])) V.fuori.push({ t: m[1], s: m[2], g: C.giorno }) }
  V.fuori = (V.fuori ?? []).slice(-24)
  // chi legge (o sente in piazza) di un motivo se lo segna: potrebbe volerlo fare proprio così
  for (const b of verbale) { const v = V.ab[b.chi]; const m = v && motivoIn(b.testo); if (m && !(v.letti ??= []).includes(m) && !(v.costruiti ?? []).includes(m)) v.letti.push(m) }
  // quello che ha letto, cercato e detto oggi diventa argomento suo (le parole tra «»)
  for (const b of verbale) { const v = V.ab[b.chi]; if (!v) continue; for (const m of b.testo.matchAll(/«([^»]{3,40})»/g)) { const w = m[1].toLowerCase().split(/\s+/).find(x => x.length > 4) ?? m[1].toLowerCase(); if (w.length > 24) continue; v.argomenti[w] = Math.min(3, (v.argomenti[w] ?? 0) + (b.tipo === 'legge' || b.tipo === 'risposta' ? 0.5 : 0.3)) } }
  const gestiQui = new Map<string, number>()
  const piani = new Map(C.abitanti.map(a => [a.id, pianifica(V, C, a, r)]))
  for (const a of C.abitanti) V.ab[a.id].oggi = []
  V.atti = []; V.gesti = []
  for (let h = 0; h < 24; h++) {
    const qui = new Map<string, { a: Abitante; ogg?: string; b: Blocco }[]>() // chi c'è, dove, quest'ora
    for (const a of C.abitanti) {
      const v = V.ab[a.id]
      for (const [b, x] of Object.entries(CRESCE) as [Bisogno, number][]) v.bisogni[b] = clamp(v.bisogni[b] + x * (b === 'compagnia' ? 1 + a.carattere.trascinatore : 1))
      for (const k of Object.keys(v.voglia) as Interesse[]) v.voglia[k] = clamp((v.voglia[k] ?? 0) + 0.15 / 24)
      let b = piani.get(a.id)!.find(x => h >= x.h0 && h < x.h1) ?? { h0: h, h1: h + 1, luogo: 'casa:' + a.id, perche: 'riposa' }
      // l'urgenza scavalca il programma, ma chi dorme non si alza per un capriccio
      if (b.ogg !== 'letto' || h >= 6) for (const [n, soglia, oggs] of URGE) if (v.bisogni[n] > (b.progetto ? 0.98 : soglia)) {
        const dove = V.luoghi.filter(l => (l.tipo !== 'casa' || l.chi === a.id) && !v.evita[l.id]).flatMap(l => oggettiIn(V, l.id, h, gs, v).filter(o => oggs.includes(o)).map(o => [l, o] as const))
        if (!dove.length) continue
        const L0 = luogoDi(V, b.luogo) ?? luogoDi(V, 'piazza')!, [L, o] = dove.sort((x, y) => dist(x[0], L0) - dist(y[0], L0))[0]
        b = { h0: h, h1: h + 1, luogo: L.id, ogg: o, perche: `${OGG[o].fa}: non ce la fa più (${n})` }; break
      }
      const ogg = b.ogg && oggettiIn(V, b.luogo, h, gs, v).includes(b.ogg) ? b.ogg : sceglie(V, a, v, b.luogo, h, gs, r, b.perche === 'lavora')
      if (!qui.has(b.luogo)) qui.set(b.luogo, []); qui.get(b.luogo)!.push({ a, ogg, b })
      const L = luogoDi(V, b.luogo)!, prima = v.oggi!.at(-1)
      if (prima && prima.luogo !== b.luogo) { const k = [prima.luogo, b.luogo].sort().join('>'); V.vie[k] = (V.vie[k] ?? 0) + 1 } // il cammino consuma la strada
      v.oggi!.push({ h, luogo: b.luogo, x: L.x, y: L.y, fa: ogg ? OGG[ogg].fa : b.perche })
      if (ogg) usa(V, a, v, ogg, prima?.luogo === b.luogo && prima.fa === OGG[ogg].fa)
      // il gesto: libero, quando ne ha voglia, dove si trova
      if (L.tipo !== 'casa' && h >= 8 && h <= 22 && !/dorme/.test(b.perche) && V.gesti!.length < 40 && V.gesti!.filter(g => g.chi === a.id).length < (a.tipo === ('cittadino' as Abitante['tipo']) ? 1 : 2)) {
        const spinta = 0.04 + a.carattere.visionario * 0.05 + (1 - v.bisogni.ispirazione) * 0.04 + (b.perche === 'lavora' ? 0.05 : 0) + (b.perche.startsWith('segue') ? 0.25 : 0)
        if (r() < spinta) { const aff = V.tracce.filter(t => t.luogo === L.id).length + (gestiQui.get(L.id) ?? 0); const G = gesto(V, C, T, a, L, h, r, aff)
          if (G) { V.gesti!.push(G); gestiQui.set(L.id, (gestiQui.get(L.id) ?? 0) + 1); verbale.push({ fase: faseDi(L), chi: a.id, tipo: 'gesto', testo: G.testo }); nota(v, C.giorno, G.testo, 'gesto', 0.4, undefined, L.id); v.bisogni.ispirazione = clamp(v.bisogni.ispirazione - 0.2) } }
      }
      // l'atto: quello che domani si vedrà nella città (un graffito, un ritaglio, un velario, una tavola spostata…)
      if (ogg && OGG[ogg].traccia && OGG[ogg].traccia !== 'incontro' && !V.atti.some(x => x.chi === a.id && x.ogg === ogg)) V.atti.push({ chi: a.id, ogg, luogo: b.luogo, q: L.q ?? qDi(C, T, a, b.luogo), h })
    }
    // gli incontri: chi sta nello stesso posto alla stessa ora si conosce, si stima, a volte litiga; e lavora insieme
    for (const [luogo, gente] of qui) {
      if (gente.length < 2 || luogo.startsWith('casa:')) continue
      for (let i = 0; i < gente.length; i++) for (let j = i + 1; j < gente.length; j++) {
        const A = gente[i], B = gente[j], va = V.ab[A.a.id], vb = V.ab[B.a.id], ra = relDi(va, B.a.id), rb = relDi(vb, A.a.id)
        const comune = (Object.keys(va.interessi) as Interesse[]).filter(k => vb.interessi[k]), stessoOgg = A.ogg && A.ogg === B.ogg
        va.bisogni.compagnia = clamp(va.bisogni.compagnia - 0.03); vb.bisogni.compagnia = clamp(vb.bisogni.compagnia - 0.03)
        ra.ore++; rb.ore++; ra.ultimo = rb.ultimo = V.giorno
        const dAff = 0.02 + (stessoOgg ? 0.03 : 0) + comune.length * 0.01; ra.aff = clamp(ra.aff + dAff, -1, 1); rb.aff = clamp(rb.aff + dAff, -1, 1)
        if (comune.length && stessoOgg) { ra.stima = clamp(ra.stima + 0.04, -1, 1); rb.stima = clamp(rb.stima + 0.04, -1, 1) }
        for (const x of [A, B]) V.ab[x.a.id].oggi!.at(-1)!.con = [...(V.ab[x.a.id].oggi!.at(-1)!.con ?? []), (x === A ? B : A).a.id]
        // le idee girano (come a Porto Vecchio): chi parla passa il suo argomento; il credulone lo prende, il testardo no,
        // il bastian contrario lo rovescia; ogni tanto si capisce male e nasce una parola vicina (l'errore creativo)
        if (A.ogg && OGG[A.ogg].int === 'chiacchiere' || (comune.length && r() < 0.3)) for (const [X, Y] of [[A, B], [B, A]]) {
          const vx = V.ab[X.a.id], vy = V.ab[Y.a.id], top = Object.entries(vx.argomenti).sort((p, q) => q[1] - p[1])[0]; if (!top) continue
          const cy = Y.a.carattere, presa = 0.08 + cy.credulone * 0.6 - cy.testardo * 0.4 + relDi(vy, X.a.id).stima * 0.3
          if (r() > presa) continue
          let w = top[0]; if (r() < 0.06) { const vicine = T.quartieri.flatMap(q => q.concetti).filter(c => c[0] === w[0] && c !== w); if (vicine.length) w = pick(r, vicine).toLowerCase() }
          const segno = r() < cy.contrario * 0.5 ? -1 : 1, nuovo = vy.argomenti[w] == null
          vy.argomenti[w] = Math.max(-2, Math.min(3, (vy.argomenti[w] ?? 0) + segno * 0.25))
          if (nuovo && r() < 0.05) parla(Y.a.id, dice(Y.a, segno > 0 ? 'preso' : 'contro', { b: X.a.nome, w }, r), faseDi(luogoDi(V, luogo)!))
        }
        // e si parla di fuori: una notizia letta che pesa (qui si ragiona sulla realtà; fuori il mondo è più duro)
        if (V.fuori?.length && A.ogg && OGG[A.ogg].int === 'chiacchiere' && r() < 0.03) {
          const nf: { t: string; s: string; g: number; detto?: number } = V.fuori[Math.floor(r() * V.fuori.length)]
          if ((nf.detto ?? 0) < 2 && !detti.some(d => d.includes(nf.t))) { nf.detto = (nf.detto ?? 0) + 1
            parla(A.a.id, dice(A.a, 'fuori', { t: nf.t, s: nf.s }, r), 'piazza'); const w = nf.t.toLowerCase().split(/\s+/).find((y: string) => y.length > 5); if (w) for (const z of [va, vb]) z.argomenti[w] = Math.min(3, (z.argomenti[w] ?? 0) + 0.4) } }
        // il litigio: due bastian contrari arrabbiati nello stesso posto
        const scintilla = (va.bisogni.rabbia + vb.bisogni.rabbia) / 2 * (A.a.carattere.contrario + B.a.carattere.contrario) / 2
        if (va.bisogni.rabbia + vb.bisogni.rabbia > 0.9 && r() < scintilla * 0.06) { ra.aff -= 0.3; rb.aff -= 0.3; ra.litigi++; rb.litigi++; va.bisogni.rabbia = clamp(va.bisogni.rabbia + 0.2); vb.bisogni.rabbia = clamp(vb.bisogni.rabbia + 0.2)
          nota(va, V.giorno, `ho litigato con ${B.a.nome}, ${a_(luogoDi(V, luogo)?.nome ?? '')}`, 'litigio', -0.6, B.a.id, luogo); nota(vb, V.giorno, `ho litigato con ${A.a.nome}`, 'litigio', -0.6, A.a.id, luogo)
          parla(A.a.id, dice(A.a, 'litigio', { b: B.a.nome, dove: a_(luogoDi(V, luogo)?.nome ?? '') }, r)) }
        // l'opera a più mani: stesso oggetto, un interesse in comune, abbastanza stima
        else if (stessoOgg && OGG[A.ogg!].traccia && OGG[A.ogg!].traccia !== 'incontro' && OGG[A.ogg!].int && comune.includes(OGG[A.ogg!].int!) && ra.stima > 0.15 && r() < 0.08) {
          const int = OGG[A.ogg!].int!, L = luogoDi(V, luogo)!, t = lascia(V, 'opera', L, [A.a.id, B.a.id], int, pick(r, tavolozzaDi(A.a.id)), r)
          t.parola = t.parola ?? `${INTERESSI[int]}`; nota(va, V.giorno, `abbiamo fatto una cosa insieme con ${B.a.nome}`, 'opera', 0.7, B.a.id, luogo); nota(vb, V.giorno, `abbiamo fatto una cosa insieme con ${A.a.nome}`, 'opera', 0.7, A.a.id, luogo)
          if (t.volte === 1) parla(A.a.id, dice(A.a, 'opera', { b: B.a.nome, dove: a_(L.nome), noi: NOI[A.ogg!] ?? 'abbiamo lavorato insieme' }, r), faseDi(L))
        }
      }
    }
    // i passi dei progetti: fatti se all'ora giusta erano nel posto giusto (e, per gli appuntamenti, se è venuto anche l'altro)
    for (const a of C.abitanti) for (const p of V.ab[a.id].progetti.filter(p => p.stato === 'in corso')) {
      const s = p.passi.find(x => !x.fatto); if (!s || h !== s.h + 1 || s.oggi !== V.giorno) continue
      const io = V.ab[a.id].oggi!.at(-1), cEra = io?.luogo === s.luogo
      if (s.k === 'meet') { const lui = V.ab[s.chi!]?.oggi?.at(-1), venuto = lui?.luogo === s.luogo || r() < (p.tipo === 'ricreare' ? 0.85 : 0.55) + relDi(V.ab[s.chi!] ?? V.ab[a.id], a.id).aff * 0.4
        if (cEra && venuto) { s.fatto = true; const ra = relDi(V.ab[a.id], s.chi!); ra.aff = clamp(ra.aff + 0.15, -1, 1); if (p.tipo === 'pace') { ra.litigi = 0; ra.aff = Math.max(ra.aff, 0.1) } }
        else { p.stato = 'fallito'; nota(V.ab[a.id], V.giorno, `${nomeDi(s.chi!)} mi ha dato buca`, 'bidone', -0.4, s.chi, s.luogo); const ra = relDi(V.ab[a.id], s.chi!); ra.aff = clamp(ra.aff - 0.15, -1, 1) } }
      else if (cEra) s.fatto = true
      if (s.fatto && p.tipo === 'ricreare') passoRicreare(V, C, a, p, s, parla)
      if (p.stato === 'in corso' && p.passi.every(x => x.fatto)) { p.stato = 'riuscito'; compi(V, C, a, p, r, tavolozzaDi, parla) }
    }
  }
  // la notte: la mente rilegge il diario e decide
  for (const a of C.abitanti) { rifletti(V, C, a, r, verbale)
    const v = V.ab[a.id]; for (const [w, x] of Object.entries(v.argomenti)) { v.argomenti[w] = x * 0.85; if (Math.abs(v.argomenti[w]) < 0.05) { delete v.argomenti[w]; continue } const k = radice(w); if (k && x > 0.6) a.interessi[k] = Math.min(1.5, (a.interessi[k] ?? 0) * 0.9 + x * 0.15) } }
  consolida(V, C, parla, r)
  V.cronaca.push(...detti.slice(0, 6).map(t => ({ g: C.giorno, testo: t }))); V.cronaca = V.cronaca.slice(-60)
  return detti
  } finally { C.abitanti = veri }
}
// in che territorio lavora chi usa un attrezzo fuori dalle sale: la sala che cura, o quella dei suoi interessi
function qDi(C: Citta, T: Territorio, a: Abitante, luogo: string): number | undefined {
  if (luogo.startsWith('confine:')) return +luogo.split(':')[1].split('|')[0]
  const mia = Object.entries(C.sale ?? {}).find(([, s]) => s.curatore === a.id)?.[0]; if (mia) return +mia
  let best: number | undefined, bv = -1; for (const Q of T.quartieri) { const v = Q.concetti.reduce((s, c) => s + (a.interessi[radice(c) ?? ''] ?? 0), 0); if (v > bv) { bv = v; best = Q.id } } return best
}
const faseDi = (L: Luogo): Cella => (['piazza', 'biblioteca', 'bottega', 'osservatorio', 'archivio', 'assemblea'].includes(L.tipo) ? L.tipo : L.tipo === 'casa' ? 'casa' : 'cammino') as Cella

// sceglie un oggetto nel posto dove si trova (chooseObj): per bisogno, per voglia, per abitudine
function sceglie(V: Vita, a: Abitante, v: VitaAb, luogo: string, h: number, gs: number, r: () => number, lavoro = false): string | undefined {
  const lista = oggettiIn(V, luogo, h, gs, v); if (!lista.length) return undefined
  let best: string | undefined, bv = -1e9
  for (const k of lista) { const o = OGG[k]; let s = r() * 0.2
    for (const [b, x] of Object.entries({ ...o.once, ...o.perH }) as [Bisogno, number][]) s += -x * v.bisogni[b] * 3
    if (o.int) s += (v.interessi[o.int] ?? 0) * 0.6 + (v.voglia[o.int] ?? 0) * 0.5
    s += Math.min(0.4, (v.fatte[k] ?? 0) * 0.01) // l'abitudine
    if (lavoro && o.traccia && o.traccia !== 'incontro') s += 1.2 // al lavoro si lavora con gli attrezzi
    if (k === 'letto' && h > 7 && h < 21) s -= 2
    if (s > bv) { bv = s; best = k } }
  return best
}
// l'uso di un oggetto: cala i bisogni, sazia la voglia, lascia la traccia (la ripetizione la fa crescere)
function usa(V: Vita, a: Abitante, v: VitaAb, k: string, continua: boolean) {
  const o = OGG[k]
  for (const [b, x] of Object.entries(o.once ?? {}) as [Bisogno, number][]) v.bisogni[b] = clamp(v.bisogni[b] + x)
  for (const [b, x] of Object.entries(o.perH ?? {}) as [Bisogno, number][]) v.bisogni[b] = clamp(v.bisogni[b] + x)
  if (o.costo) v.bisogni.materiali = clamp(v.bisogni.materiali + o.costo * 0.03)
  if (o.int && v.voglia[o.int] != null) v.voglia[o.int] = clamp(v.voglia[o.int]! - 0.12)
  v.fatte[k] = (v.fatte[k] ?? 0) + 1
  const L = luogoDi(V, v.oggi!.at(-1)!.luogo)
  if (o.traccia && o.traccia !== 'opera' && o.traccia !== 'incontro' && L && !continua) lascia(V, o.traccia, L, [a.id], o.int, undefined, () => 0.5)
  if (o.traccia === 'incontro' && L) { const t = V.tracce.find(t => t.tipo === 'incontro' && t.luogo === L.id); if (t) { t.volte++; t.ultimo = V.giorno; if (!t.chi.includes(a.id)) t.chi.push(a.id) } else lascia(V, 'incontro', L, [a.id], 'chiacchiere', undefined, () => 0.5) }
}
function lascia(V: Vita, tipo: Traccia, L: Luogo, chi: string[], int?: Interesse, colore?: string, r: () => number = Math.random): TracciaSpazio {
  // la stessa cosa nello stesso posto non si duplica: si ripete, e cresce
  const t = V.tracce.find(t => t.tipo === tipo && t.luogo === L.id && (tipo !== 'opera' || t.chi.join() === chi.join()))
  if (t) { t.volte++; t.ultimo = V.giorno; for (const c of chi) if (!t.chi.includes(c)) t.chi.push(c); return t }
  const n: TracciaSpazio = { id: `${tipo}-${L.id}-${V.giorno}-${V.tracce.length}`, tipo, luogo: L.id, x: L.x + (r() - 0.5) * 10, y: L.y + (r() - 0.5) * 10, chi: [...chi], dal: V.giorno, ultimo: V.giorno, volte: 1, int, colore: colore ?? PALETTE[(V.tracce.length * 7) % PALETTE.length] }
  V.tracce.push(n); if (V.tracce.length > 600) V.tracce.splice(V.tracce.findIndex(x => x.volte < 2), 1)
  return n
}
// i passi del volere un motivo: domanda ai saggisti (che cercano davvero in rete), richiesta all'officina, uso
function passoRicreare(V: Vita, C: Citta, a: Abitante, p: Progetto, s: Passo, parla: (chi: string, t: string, f?: Cella) => void) {
  const motivo = p.label.match(/«(.+)»/)?.[1] ?? '', M = MOTIVI[motivo]; if (!M) return
  const Cx = C as Citta & { domande: { giorno: number; chi: string; testo: string; stato: string; argomento?: string; cerca?: string }[]; officina?: { richieste: { autore: string; scopo: string; strumenti: string[]; modo: 'zero' | 'ramo' | 'innesto'; base?: string; giorno: number }[]; esiti: unknown[]; tenuti: unknown[] } }
  if (s.ogg === 'leggio') { Cx.domande.push({ giorno: C.giorno, chi: a.id, testo: `Come si fa il motivo «${motivo}»? Con che regole si costruisce, passo per passo?`, stato: 'aperta', argomento: motivo, cerca: `${motivo} costruzione geometrica` }); parla(a.id, `Ho letto del motivo «${motivo}» e lo voglio fare proprio così. Ho chiesto alla biblioteca come si costruisce.`, 'biblioteca') }
  else if (s.k === 'meet') parla(a.id, `Con ${C.abitanti.find(x => x.id === s.chi)?.nome} abbiamo smontato il motivo «${motivo}»: ci vogliono ${M.str.map(x => STRUMENTI[x] ?? x).join(', ')}. Sulla carta torna, adesso va fatto tornare davvero.`, 'bottega')
  else if (s.ogg === 'banco') { (Cx.officina ??= { richieste: [], esiti: [], tenuti: [] }).richieste.push({ autore: a.nome, scopo: `il motivo «${motivo}»`, strumenti: M.str, modo: 'zero', giorno: C.giorno }); (V.ab[a.id].costruiti ??= []).push(motivo); parla(a.id, `In officina ho messo insieme il generatore del motivo «${motivo}», con ${M.str.map(x => STRUMENTI[x] ?? x).join(', ')}. Se regge, entra tra gli attrezzi di tutti.`, 'bottega') }
  else { const L = luogoDi(V, s.luogo); if (L) { const G: Gesto = { chi: a.id, verbo: 'stende', strumento: 'motivo:' + motivo, supporto: L.tipo === 'sala' ? 'aria' : 'suolo', luogo: L.id, q: L.q, x: L.x, y: L.y, parola: motivo, colore: PALETTE[C.giorno % PALETTE.length], testo: `Ho steso il motivo «${motivo}» che abbiamo costruito ${L.tipo === 'sala' ? 'su un piano nuovo' : 'per terra'}, ${a_(L.nome)}. È venuto quasi come nel libro, e il quasi è la parte nostra.`, h: s.h }
    ;(V.gesti ??= []).push(G); parla(a.id, G.testo, faseDi(L)); const v = V.ab[a.id]; v.letti = (v.letti ?? []).filter(x => x !== motivo) } }
}
// un progetto riuscito lascia la sua cosa
function compi(V: Vita, C: Citta, a: Abitante, p: Progetto, r: () => number, tav: (id: string) => string[], parla: (chi: string, t: string, f?: Cella) => void) {
  const v = V.ab[a.id], ultimo = p.passi.at(-1)!, L = luogoDi(V, ultimo.luogo) ?? luogoDi(V, 'piazza')!
  nota(v, V.giorno, `ce l'ho fatta: ${p.label}`, 'progetto', 0.8, p.con, L.id)
  const T: Record<string, Traccia> = { serie: 'opera', insieme: 'opera', orto: 'pianta', vestito: 'capo', muro: 'scritta', festa: 'festa' }
  const tipo = T[p.tipo]; if (tipo) { const t = lascia(V, tipo, L, p.con ? [a.id, p.con] : [a.id], p.int, pick(r, tav(a.id)), r); t.volte += 2; t.nome = p.label }
  const bNome = C.abitanti.find(x => x.id === p.con)?.nome ?? '', detto = dice(a, p.tipo, { b: bNome, dove: a_(L.nome), label: p.label }, r)
  if (detto) parla(a.id, detto, faseDi(L))
  if (p.tipo === 'vestito') (a as Abitante & { capoNuovo?: number }).capoNuovo = V.giorno
  // la serie e l'opera a più mani diventano una tavola vera: una commissione in bottega, con le mani di chi l'ha fatta
  if (p.tipo === 'serie' || p.tipo === 'insieme' || p.tipo === 'ricreare') {
    const B = C.abitanti.find(x => x.id === p.con), Cb = C as Citta & { bottega?: import('./sospese').Commissione[] }
    const fam: Record<string, string> = { vetri: 'luce', torchio: 'grana', forbici: 'taglia', cavalletto: 'materia', scavo: 'fondo', telescopio: 'shader', simulatore: 'shader', orto: 'semina', leggio: 'scrivi', muro: 'scrivi', banco: 'geometria', sentiero: 'traccia', telaio: 'pattern', scaffali: 'ripeti' }
    const sts = [...new Set([...(p.tipo === 'ricreare' ? MOTIVI[(p.label.match(/«(.+)»/)?.[1] ?? '')]?.str ?? [] : []), ...(p.passi.map(x => fam[x.ogg ?? '']).filter(Boolean) as string[]), ...[a, B].filter(Boolean).flatMap(x => Object.keys(x!.interessi).filter(k => k.startsWith('m:')).map(k => k.slice(2)))])]
    const arg = p.tipo === 'ricreare' ? (p.label.match(/«(.+)»/)?.[1] ?? '') : Object.entries(v.argomenti).filter(([w]) => !B || (V.ab[B.id]?.argomenti[w] ?? 0) > 0).sort((x, y) => y[1] - x[1])[0]?.[0] ?? Object.entries(v.argomenti).sort((x, y) => y[1] - x[1])[0]?.[0]
    if (sts.length && arg && !(Cb.bottega ??= []).some(c => c.stato === 'in attesa' && c.giorno === C.giorno)) {
      Cb.bottega.push({ id: `v${C.giorno}.${Cb.bottega.length}`, giorno: C.giorno, autore: a.id, nome: a.nome, con: B?.nome, parola: arg, strumenti: sts.slice(0, 6), perche: `nata ${a_(L.nome)}: ${p.label}`, stato: 'in attesa' })
      parla(a.id, L.id === 'bottega' ? `Quello che abbiamo fatto qui diventa una tavola su «${arg}».` : `Quello che abbiamo fatto ${a_(L.nome)} lo porto in bottega: una tavola su «${arg}».`, 'bottega')
    }
  }
}
// i cicli di ripetizione: quello che si ripete si consolida e diventa città
function consolida(V: Vita, C: Citta, parla: (chi: string, t: string, f?: Cella) => void, r: () => number) {
  for (const t of V.tracce) {
    // una panchina frequentata da molti diventa un luogo con un nome, dato da chi ci passa di più
    if (t.tipo === 'incontro' && t.volte >= 40 && t.chi.length >= 5 && !t.nome) { const L = luogoDi(V, t.luogo)!; if (L.tipo !== 'confine' && L.tipo !== 'piazza') continue
      const chi = t.chi[0], nome = `la piazzetta ${di_(C.abitanti.find(a => a.id === chi)?.nome ?? chi)}`; t.nome = nome
      V.luoghi.push({ id: 'piazzetta:' + t.id, tipo: 'piazza', nome, x: t.x + 14, y: t.y + 8, nato: V.giorno, chi }); parla(chi, dice(C.abitanti.find(a => a.id === chi) ?? C.abitanti[0], 'piazzetta', { dove: a_(L.nome), nome }, r)) }
    // un orto curato per tanti giorni diventa giardino
    if (t.tipo === 'pianta' && t.volte >= 12 && !t.nome) { t.nome = 'giardino'; parla(t.chi[0], dice(C.abitanti.find(a => a.id === t.chi[0]) ?? C.abitanti[0], 'giardino', { dove: a_(luogoDi(V, t.luogo)?.nome ?? '') }, r)) }
    // le scritte sullo stesso muro si stratificano: dopo tante, il muro è di tutti
    if (t.tipo === 'scritta' && t.volte >= 6 && t.chi.length >= 3 && !t.nome) { t.nome = 'il muro di tutti'; parla(t.chi.at(-1)!, dice(C.abitanti.find(a => a.id === t.chi.at(-1)) ?? C.abitanti[0], 'muroTutti', { dove: luogoDi(V, t.luogo)?.nome ?? '' }, r)) }
  }
  // i sentieri che nessuno fa più si richiudono piano
  for (const k of Object.keys(V.vie)) { V.vie[k] *= 0.97; if (V.vie[k] < 0.5) delete V.vie[k] }
}

/** per il sito: quello che serve a disegnare la vita (luoghi, tracce, vie, e la giornata di ciascuno) */
export function vitaPerIlSito(C: Citta & { vita?: Vita }) {
  const V = C.vita; if (!V) return null
  return {
    popolo: (V.popolo ?? []).map(a => ({ id: a.id, nome: a.nome, tipo: a.tipo, carica: a.carica, carattere: a.carattere, vesti: a.vesti, fem: a.fem, casa: a.casa })),
    luoghi: V.luoghi, tracce: V.tracce, gesti: (V.gesti ?? []).map(g => ({ chi: g.chi, testo: g.testo, luogo: g.luogo })), vie: Object.entries(V.vie).filter(([, n]) => n >= 1).map(([k, n]) => [...k.split('>'), +n.toFixed(1)]), cronaca: V.cronaca.slice(-20),
    ab: Object.fromEntries(Object.entries(V.ab).map(([id, v]) => [id, {
      bisogni: Object.fromEntries(Object.entries(v.bisogni).map(([k, x]) => [k, +x.toFixed(2)])), saperi: Object.fromEntries(Object.entries(v.saperi ?? {}).sort((x, y) => y[1] - x[1]).map(([k, x]) => [k, +x.toFixed(2)])), interessi: Object.keys(v.interessi).map(k => INTERESSI[k as Interesse]),
      amici: Object.entries(v.rel).filter(([, x]) => x.aff > 0.35).sort((a, b) => b[1].aff - a[1].aff).slice(0, 5).map(([k]) => k),
      rivali: Object.entries(v.rel).filter(([, x]) => x.aff < -0.1).map(([k]) => k), progetti: v.progetti.slice(-4).map(p => ({ label: p.label, stato: p.stato, passo: p.passi.filter(x => x.fatto).length + '/' + p.passi.length })),
      pensiero: v.pensiero, diario: v.diario.slice(-5).map(d => `giorno ${d.g} · ${d.testo}`), oggi: v.oggi,
    }])),
  }
}
