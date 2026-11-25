// grandezze.js — IL GRAFO DELLE GRANDEZZE: chi dipende da chi, da quale fonte, e come si legge.
//
// Il principio (regola 7 dell'INTRECCIO, e la sua estensione): una formula dipende da variabili che dipendono da altre
// formule; si può partire dal basso o dall'alto, ma tutto deve essere COLLEGATO (ogni grandezza ha una fonte sola e
// dichiara da che cosa dipende), CONTINUO (se un ingresso varia di poco l'uscita non salta, se non dove salta la
// natura), CORRELATO (ciò che dipende dalle stesse cose si muove insieme, nel verso che la dipendenza dice) e
// PERCORRIBILE NEI DUE VERSI (un valore visto in basso dice in che intervallo stanno quelli in alto).
//
// Questo modulo NON calcola fisica nuova: DICHIARA. È un dato leggibile da un programma:
//   FONTI      le funzioni vere dei moduli che calcolano le grandezze: { modulo, funzione, chiamante, riceve (gli
//              ingressi che il programma le passa), chiama(M, m) }.
//              È L'UNICO POSTO in cui sta scritto il nome di una funzione di un altro modulo e come le si passano gli
//              argomenti (gli stessi fili di cosmo.js `sistema`): se una fonte cambia nome o firma si corregge qui.
//   GRANDEZZE  l'elenco: { nome, unita, livello, gruppo, tipo, leggi (dove sta in un oggetto vero), altrove (le sue
//              copie), fonte (chiave di FONTI), esce (dove sta nel risultato della fonte), dipende (da quali
//              grandezze), controlli (altre funzioni che calcolano la stessa cosa e devono dare lo stesso numero),
//              intervallo e passo (per farla variare), vale (dove la fonte si applica), fuoriDominio (da dove viene
//              il valore dove la fonte non si applica), trascurabile (la scala sotto cui non conta), seDiversa (perché
//              il valore tenuto può non coincidere con la fonte richiamata) }.
//   CICLI      le dipendenze circolari DICHIARATE (il clima e l'aria si cercano insieme), chi le chiude, e se il
//              ciclo può saltare da uno stato stabile a un altro (`salta`).
//   SOGLIE     i punti in cui il codice salta, letti nei moduli uno per uno, ognuno con la sua specie: «fisica» (una
//              transizione vera: l'acqua gela) o «comodo» (un `if` su un tipo, un numero di taglio).
//   NUMERI_CON_FONTE  i numeri che hanno già un nome (una costante o una grandezza del grafo): chi li riscrive a mano
//              in mezzo a una formula ha un filo in meno (li cerca test/test_grandezze.mjs).
// e gli attrezzi per usarlo: leggere una grandezza da un mondo vero (`valore`), ricalcolarla dalla sua fonte
// (`ricalcola`), farne variare un ingresso con tutto il resto fermo (`conValore`, `scansione`), chiedere che cosa un
// valore osservato in basso impone in alto (`impone`, `chiedeDalBasso`: quest'ultima si appoggia a `chiede` di bolle.js).
//
// IL MONDO di cui si leggono le grandezze è M = { via, P, S, Sis, G }: il pianeta P e la stella S come li dà
// `sistema()` di cosmo.js (lo stesso M di bolle.js, con in più il sistema e la galassia). Le grandezze della
// superficie (mare, pioggia, erosione) si leggono da U = { cl, se, mare } (come in bolle.js): costano dieci secondi a
// pianeta, quindi il grafo le dichiara ma il campione delle prove si ferma al pianeta (`campione: false`).
//
// DATI: nessuno nuovo. Gli intervalli fisici entro cui far variare un ingresso sono DICHIARATI qui (servono solo alle
// prove: non entrano in nessun calcolo del mondo). PARAMETRI LIBERI: nessuno che tocchi il mondo.
// CHE COSA NON TORNA: lo dice la prova (test/test_grandezze.mjs) e lo raccoglie reports/Mappa delle grandezze.md.
// CHE COSA MANCA: la superficie nel campione; gli archi «storia» (ciò che esce da una storia di eventi: il disco, la
// galassia) si controllano solo per correlazione, non facendo variare un ingresso; il grafo arriva a chimica e
// materia solo per ciò che passa dal pianeta (energia per la chimica, mattoni della vita, gas radiogenici).

import * as mLeggi from './leggi.js';
import * as mStelle from './stelle.js';
import * as mGalassie from './galassie.js';
import * as mDisco from './disco.js';
import * as mRotazione from './rotazione.js';
import * as mLune from './lune.js';
import * as mOrbite from './orbite.js';
import * as mGeologia from './geologia.js';
import * as mChimica from './chimica.js';
import * as mRisalita from './risalita.js';
import * as mMateria from './materia.js';
import * as mAlbero from './albero_vita.js';
import * as mMare from './mare.js';
import * as mMeteo from './meteo.js';
import * as mEventi from './eventi.js';
import * as mCosmo from './cosmo.js';
import * as mBolle from './bolle.js';
import * as mStoria from './storia.js';
import { scrivi as scriviIndirizzo, daVia } from './lingua.js';
import { ZERO_CELSIUS } from './leggi.js'; // le costanti e le unità: un posto solo

// i moduli, per nome di file: una fonte dice «modulo: 'leggi.js', funzione: 'clima'» e la funzione si cerca qui al
// momento della chiamata (se un modulo l'ha rinominata, `coerenza()` lo dice invece di far cadere tutto)
export const MODULI = {
  'leggi.js': mLeggi, 'stelle.js': mStelle, 'galassie.js': mGalassie, 'disco.js': mDisco, 'rotazione.js': mRotazione, 'lune.js': mLune, 'orbite.js': mOrbite,
  'geologia.js': mGeologia, 'chimica.js': mChimica, 'risalita.js': mRisalita, 'materia.js': mMateria, 'albero_vita.js': mAlbero, 'mare.js': mMare, 'meteo.js': mMeteo,
  'eventi.js': mEventi, 'cosmo.js': mCosmo, 'bolle.js': mBolle, 'storia.js': mStoria,
};
const K = mLeggi.COSTANTI, { MSOLE, RSOLE, LSOLE, UA } = mLeggi, LATO = mCosmo.LATO_SISTEMA_M, MTERRA = mDisco.MTERRA;
const SOLIDI = ['roccioso', 'ghiacciato'], VIVA = ['in vita', 'gigante rossa'];

// =====================================================================================================
// 1. LEGGERE E SCRIVERE una grandezza in un mondo vero
// =====================================================================================================
export const daPercorso = (o, percorso) => { if (!percorso) return o; for (const k of percorso.split('.')) { if (o == null) return undefined; o = o[k]; } return o; };
// una copia di un oggetto del programma che si può modificare senza toccare l'originale (tiene anche le proprietà non
// enumerabili: P.formazione, P.impatti)
const copia = (o) => { if (Array.isArray(o)) return o.slice(); const d = Object.getOwnPropertyDescriptors(o); for (const k in d) if ('value' in d[k]) { d[k].writable = true; d[k].configurable = true; } return Object.create(Object.getPrototypeOf(o), d); };
function scriviPercorso(radice, percorso, v) {
  const ks = percorso.split('.'); let o = radice; if (ks[ks.length - 1] === 'length') return false; // (un conteggio non si scrive: è la lunghezza di un elenco)
  for (let i = 0; i < ks.length - 1; i++) { const f = o[ks[i]]; if (f == null || typeof f !== 'object') return false; o[ks[i]] = copia(f); o = o[ks[i]]; }
  o[ks[ks.length - 1]] = v; return true;
}
// «leggi» di una grandezza: 'P.clima.T' | { da: 'S.r', per: 4.5e12 } | { primo: ['P.composizione.acqua', 'P.composizione.ghiaccio'] }
const postiDi = (g) => { const uno = (p) => (typeof p === 'string' ? { da: p, per: 1 } : { da: p.da, per: p.per ?? 1 });
  const primi = g.leggi == null ? [] : g.leggi.primo ? g.leggi.primo.map(uno) : [uno(g.leggi)]; return { primi, copie: (g.altrove || []).map(uno) }; };

// =====================================================================================================
// 2. LE FONTI: le funzioni vere, e i fili con cui il programma le chiama (cosmo.js `sistema`)
// =====================================================================================================
const v = (M, nome) => valore(nome, M);
const Zdi = (M) => v(M, 'stella.metalli') ?? 1;
const corpoDi = (M) => ({ tipo: v(M, 'pianeta.tipo'), massaKg: v(M, 'pianeta.massa'), raggioM: v(M, 'pianeta.raggio'), composizione: M.P.composizione || {}, involucro: v(M, 'pianeta.involucro') || 0 });
// i gas saliti dall'interno, come li passa cosmo.js a climaEAria (argon ed elio radiogenici, se la gravità li tiene)
const radiogenici = (M, m) => { const c = corpoDi(M), Lw = v(M, 'stella.luminosita'), aM = v(M, 'orbita.distanza');
  return m['risalita.js'].gasRadiogenici({ pianeta: { g: (K.G * c.massaKg) / c.raggioM ** 2, raggioM: c.raggioM, eta: v(M, 'stella.eta') }, stella: { Lw, aM } }, { P: { ...c, interno: M.P.interno, Lw, aM } }); };
const inertiDi = (M, m) => { try { const gr = radiogenici(M, m); return { Ar: gr.argon40.trattenuto ? gr.perLAria.Ar : 0, He: gr.elio4.trattenuto ? gr.perLAria.He : 0 }; } catch { return null; } };
// ciò che cosmo.js passa a climaEAria (e che clima() di leggi.js riceve da lei)
const datiClima = (M) => ({ ...corpoDi(M), Lw: v(M, 'stella.luminosita'), aM: v(M, 'orbita.distanza'), acqua: v(M, 'pianeta.acqua') ?? 0, acquaKg: v(M, 'acqua.inSuperficie'), anno: v(M, 'orbita.anno'),
  giorno: v(M, 'pianeta.giorno'), obliquita: v(M, 'pianeta.obliquita'), bloccato: v(M, 'pianeta.bloccato'), placche: v(M, 'interno.tettonica') === 'a placche' });
// ciò che climaEAria aggiunge all'aria quando la passa a clima(): la massa molare e il calore specifico dei suoi gas
const gasPerIlClima = (M, m) => (typeof m['chimica.js'].gasDellAria === 'function' ? m['chimica.js'].gasDellAria(M.P.atmosfera?.gas || {}) : {});
// il magma dei vulcani dalla storia termica, come lo passa cosmo.js a climaEAria (magmaDi)
const magmaDi = (M, m) => { if (v(M, 'pianeta.tipo') === 'gassoso' || !(v(M, 'interno.vulcani') > 0)) return {}; const f = m['storia.js'].storia(M.P, v(M, 'stella.eta'), { stella: M.S }).fuso; return f && f.kgAnno > 0 && f.frazione > 0 ? { magma: f.kgAnno, fusoMantello: f.kgAnno / f.frazione } : {}; };
const stellaPerRisalita = (M) => ({ T: v(M, 'stella.temperatura') > 0 ? v(M, 'stella.temperatura') : undefined, eta: v(M, 'stella.eta'), massa: v(M, 'stella.massa') });
const casoPianeta = (M, m) => m['eventi.js'].sorgente(`cosmo ${m['cosmo.js'].cosmoBase(M.via.cosmo)}/galassia ${M.via.galassia}/stella ${M.via.stella}/pianeta ${M.P.id}`, m['cosmo.js'].ramiCosmo(M.via.cosmo));

// l'interno esce dalla storia termica del pianeta (storia.js, che interno() di geologia.js richiama): ogni sua uscita
// sente la massa, il raggio, di che cosa è fatto, l'età e i metalli (la radioattività), e la stella (la marea, la
// temperatura della superficie nuda)
const INTERNO_DA = ['pianeta.massa', 'pianeta.raggio', 'pianeta.ferro', 'pianeta.acqua', 'pianeta.tipo', 'stella.eta', 'stella.metalli', 'stella.luminosita', 'orbita.distanza', 'orbita.eccentricita', 'stella.massa', 'stella.massaNascita'];
// chiama(M, m): M il mondo (anche modificato da conValore), m = MODULI. `chiamante`: dove il programma la chiama davvero.
// `rifa`: grandezze che la chiamata ricalcola da sé prima di passarle (gli inerti: come fa cosmo.js).
// `inLinea`: la grandezza è calcolata con una formula scritta dentro un'altra funzione: non c'è niente da chiamare.
// `storia`: esce da una storia di eventi (il disco, la galassia): non si può rifare cambiando un ingresso solo.
export const FONTI = {
  massaAlone: { modulo: 'galassie.js', funzione: 'massaAlone', chiamante: 'galassie.js aloneGalassia', chiama: (M, m) => m['galassie.js'].massaAlone(v(M, 'cosmo.picco')) },
  formaGalassia: { modulo: 'galassie.js', funzione: 'formaGalassia', chiamante: 'cosmo.js cosmo', storia: true },
  stelleGalassia: { modulo: 'galassie.js', funzione: 'stelleGalassia', chiamante: 'cosmo.js galassia', storia: true },
  // la stella oggi, viva o morta: una via sola (stelle.js stellaOggi) per luce, raggio e temperatura
  stella: { modulo: 'stelle.js', funzione: 'stellaOggi', chiamante: 'cosmo.js sistema', chiama: (M, m) => m['stelle.js'].stellaOggi(M.S) },
  // la stessa luce, dalla stessa stelle.stella, AL TEMPO DEL DISCO (disco.js la legge così)
  stellaAlDisco: { modulo: 'stelle.js', funzione: 'stella', chiamante: 'disco.js disco', chiama: (M, m) => m['stelle.js'].stella(Math.max(0.01, v(M, 'stella.massaNascita')), { Z: Math.max(0, Zdi(M)), eta: M.Sis.disco.tDisco }) },
  disco: { modulo: 'disco.js', funzione: 'disco', chiamante: 'cosmo.js sistema', storia: true },
  // la storia termica del pianeta (storia.js): ciò che interno() ne riassume, e in più la marea, il mantello, la mobilità della crosta
  storiaTermica: { modulo: 'storia.js', funzione: 'storia', riceve: [...INTERNO_DA, 'pianeta.giorno'], chiamante: 'geologia.js interno (via internoDaStoria)', chiama: (M, m) => m['storia.js'].storia(M.P, v(M, 'stella.eta'), { stella: M.S }) },
  stellaVita: { modulo: 'stelle.js', funzione: 'stella', chiamante: 'galassie.js stelleGalassia', chiama: (M, m) => m['stelle.js'].stella(v(M, 'stella.massaNascita'), { Z: Zdi(M) }) },
  formaPianeti: { modulo: 'disco.js', funzione: 'formaPianeti', chiamante: 'cosmo.js sistema', storia: true },
  lune: { modulo: 'lune.js', funzione: 'lune', chiamante: 'cosmo.js sistema', storia: true },
  raggioPianeta: { modulo: 'disco.js', funzione: 'raggioPianeta', riceve: ['pianeta.massa', 'pianeta.ferro', 'pianeta.acqua', 'pianeta.involucro', 'pianeta.tipo', 'stella.eta', 'orbita.distanza', 'stella.luminosita'], chiamante: 'disco.js formaPianeti',
    // (il flusso è quello di OGGI: la stessa luce che il clima riceve, come lo passa formaPianeti)
    chiama: (M, m) => { const c = corpoDi(M), gas = m['rotazione.js'].gasDi(M.P); // (la parte di gas: dei giganti la sa solo rotazione.js, dalla composizione)
      return m['disco.js'].raggioPianeta({ massaKg: c.massaKg, ferro: v(M, 'pianeta.ferro'), ghiaccio: v(M, 'pianeta.acqua') ?? 0, gas, flusso: v(M, 'stella.luminosita') / LSOLE / (v(M, 'orbita.distanza') / UA) ** 2, eta: v(M, 'stella.eta') }); } },
  periodo: { modulo: 'orbite.js', funzione: 'periodo', chiamante: 'spazio3d.js elementiSistema (cosmo.js sistema lo riscrive in linea)', chiama: (M, m) => m['orbite.js'].periodo({ a: v(M, 'orbita.distanza'), mu: K.G * v(M, 'stella.massa') * MSOLE }) },
  rotazione: { modulo: 'rotazione.js', funzione: 'rotazione', riceve: ['pianeta.massa', 'pianeta.raggio', 'orbita.distanza', 'stella.massa', 'orbita.eccentricita', 'orbita.anno', 'stella.eta', 'pianeta.involucro', 'pianeta.tipo', 'pianeta.acqua'], chiamante: 'cosmo.js sistema',
    chiama: (M, m) => m['rotazione.js'].rotazione(M.P, { ...M.Sis, stella: M.S }, casoPianeta(M, m), { urto: M.P.urto, luna: (M.P.lune || []).find((l) => l.origine === 'urto' && l.giornoPianeta) || null }) },
  cosmoSistema: { modulo: 'cosmo.js', funzione: 'sistema', chiamante: 'cosmo.js sistema', inLinea: true },
  k2QPianeta: { modulo: 'lune.js', funzione: 'k2QPianeta', riceve: ['pianeta.tipo', 'acqua.stato'], chiamante: 'lune.js lune, rotazione.js (via tempoBlocco)', chiama: (M, m) => m['lune.js'].k2QPianeta(M.P) },
  interno: { modulo: 'geologia.js', funzione: 'interno', riceve: [...INTERNO_DA, 'pianeta.giorno'], chiamante: 'cosmo.js sistema', chiama: (M, m) => m['geologia.js'].interno(M.P, M.S) },
  gasRadiogenici: { modulo: 'risalita.js', funzione: 'gasRadiogenici', riceve: ['stella.eta', 'pianeta.massa', 'pianeta.raggio', 'interno.tettonica', 'stella.luminosita', 'orbita.distanza', 'pianeta.ferro', 'pianeta.tipo', 'interno.calore'], chiamante: 'cosmo.js sistema', chiama: radiogenici },
  acquaInSuperficie: { modulo: 'leggi.js', funzione: 'acquaInSuperficie', chiamante: 'cosmo.js sistema', chiama: (M, m) => m['leggi.js'].acquaInSuperficie(M.P) },
  // il clima con l'aria DATA (anello aperto): la legge di leggi.js con la pressione e la serra che il pianeta ha
  clima: { modulo: 'leggi.js', funzione: 'clima', riceve: ['stella.luminosita', 'orbita.distanza', 'pianeta.massa', 'pianeta.raggio', 'pianeta.tipo', 'pianeta.acqua', 'acqua.inSuperficie', 'orbita.anno', 'pianeta.giorno', 'pianeta.obliquita', 'pianeta.bloccato', 'interno.tettonica', 'aria.pressione', 'aria.serra', 'aria.CO2', 'aria.H2O', 'aria.CH4', 'aria.H2', 'aria.N2'], chiamante: 'chimica.js climaEAria',
    chiama: (M, m) => m['leggi.js'].clima({ ...datiClima(M), aria: v(M, 'pianeta.tipo') === 'gassoso' ? null : { pressione: v(M, 'aria.pressione'), tau: v(M, 'aria.serra'), ...gasPerIlClima(M, m) } }) },
  // l'aria con il clima DATO (anello aperto): alla temperatura e con lo stato dell'acqua che il pianeta ha
  atmosfera: { modulo: 'chimica.js', funzione: 'atmosfera', rifa: ['interno.argon'], riceve: ['pianeta.massa', 'pianeta.raggio', 'pianeta.acqua', 'pianeta.involucro', 'pianeta.tipo', 'stella.metalli', 'clima.temperatura', 'acqua.stato', 'aria.gasTenuti', 'aria.co2Ciclo', 'stella.eta', 'stella.luminosita', 'orbita.distanza', 'interno.tettonica'], chiamante: 'chimica.js climaEAria',
    chiama: (M, m) => { const c = corpoDi(M), cl = M.P.clima || {};
      if (c.tipo === 'gassoso') return m['chimica.js'].atmosfera({ ...c, clima: cl }, { Z: Zdi(M) });
      return m['chimica.js'].atmosfera({ ...c, clima: { ...cl, T: cl.Taria ?? v(M, 'clima.temperatura'), acqua: v(M, 'acqua.stato') } }, { Z: Zdi(M), inventario: true, co2: v(M, 'aria.co2Ciclo') ?? cl.termostato ?? 0, inerti: inertiDi(M, m) }); } },
  serra: { modulo: 'chimica.js', funzione: 'serra', riceve: ['aria.CO2', 'aria.H2O', 'aria.CH4', 'aria.H2', 'aria.N2', 'aria.pressione', 'pianeta.gravita', 'clima.temperatura'], chiamante: 'chimica.js climaEAria',
    chiama: (M, m) => m['chimica.js'].serra(M.P.atmosfera?.gas || {}, v(M, 'aria.pressione'), v(M, 'pianeta.gravita'), M.P.clima?.Taria ?? v(M, 'clima.temperatura')) },
  co2DelCiclo: { modulo: 'chimica.js', funzione: 'co2DelCiclo', riceve: ['clima.temperatura', 'interno.calore', 'interno.vulcani', 'pianeta.raggio', 'pianeta.massa', 'pianeta.ferro', 'acqua.mare', 'acqua.ghiaccio', 'interno.tettonica'], chiamante: 'chimica.js climaEAria',
    chiama: (M, m) => { const c = corpoDi(M), mg = magmaDi(M, m); return 1e5 * m['chimica.js'].co2DelCiclo({ magma: mg.magma ?? null, fuso: mg.fusoMantello ?? null, T: M.P.clima?.Taria ?? v(M, 'clima.temperatura'), calore: v(M, 'interno.vulcani') > 0 ? v(M, 'interno.calore') : 0, raggioM: c.raggioM, massaKg: c.massaKg, composizione: c.composizione,
      terre: (1 - (v(M, 'acqua.mare') ?? 0.7)) * (1 - (M.P.clima?.ghiaccioDelCiclo ?? v(M, 'acqua.ghiaccio') ?? 0)), continenti: v(M, 'interno.tettonica') === 'a placche' ? 1 : 0 }); } },
  // IL RISOLUTORE del ciclo clima-aria (anello chiuso): è ciò che cosmo.js chiama davvero
  climaEAria: { modulo: 'chimica.js', funzione: 'climaEAria', chiamante: 'cosmo.js sistema', risolutore: true,
    chiama: (M, m) => m['chimica.js'].climaEAria({ ...datiClima(M), calore: v(M, 'interno.vulcani') > 0 ? v(M, 'interno.calore') : 0, ...magmaDi(M, m), inerti: inertiDi(M, m) }, { Z: Zdi(M) }) },
  ebollizione: { modulo: 'leggi.js', funzione: 'ebollizione', chiamante: 'leggi.js statoAcqua', chiama: (M, m) => m['leggi.js'].ebollizione(v(M, 'aria.pressione')) },
  vaporeSaturo: { modulo: 'leggi.js', funzione: 'vaporeSaturo', chiamante: 'leggi.js riflessoNuvoleAtteso, meteo.js', chiama: (M, m) => m['leggi.js'].vaporeSaturo(v(M, 'clima.temperatura')) },
  pressioneVapore: { modulo: 'chimica.js', funzione: 'pressioneVapore', chiamante: 'chimica.js atmosfera, climaEAria', chiama: (M, m) => m['chimica.js'].pressioneVapore(v(M, 'clima.temperatura')) },
  statoAcqua: { modulo: 'leggi.js', funzione: 'statoAcqua', chiamante: 'leggi.js clima', chiama: (M, m) => m['leggi.js'].statoAcqua(v(M, 'clima.temperatura'), v(M, 'aria.pressione')) },
  temperaturaEquilibrio: { modulo: 'leggi.js', funzione: 'temperaturaEquilibrio', chiamante: 'leggi.js clima', chiama: (M, m) => m['leggi.js'].temperaturaEquilibrio(v(M, 'stella.luminosita'), v(M, 'orbita.distanza'), v(M, 'clima.albedo')) },
  mareAtteso: { modulo: 'leggi.js', funzione: 'mareAtteso', chiamante: 'leggi.js clima', chiama: (M, m) => m['leggi.js'].mareAtteso({ acquaKg: v(M, 'acqua.inSuperficie'), raggioM: v(M, 'pianeta.raggio'), placche: v(M, 'interno.tettonica') === 'a placche' }) },
  // ciò che risalita.js ricostruisce per conto suo del pianeta e della stella (una seconda via per le stesse grandezze)
  mondoDiRisalita: { modulo: 'risalita.js', funzione: 'mondoDi', chiamante: 'risalita.js (ogni sua funzione)', chiama: (M, m) => m['risalita.js'].mondoDi(m['materia.js'].luogoDaAria({ P: M.P }), { P: M.P, stella: stellaPerRisalita(M) }) },
  ventoStellare: { modulo: 'risalita.js', funzione: 'ventoStellare', riceve: ['interno.campo', 'orbita.distanza', 'stella.luminosita', 'stella.temperatura', 'stella.raggio', 'stella.eta', 'stella.massa', 'pianeta.raggio', 'pianeta.massa', 'aria.pressione', 'pianeta.gravita', 'clima.temperatura'], chiamante: 'cosmo.js sistema', chiama: (M, m) => m['risalita.js'].ventoStellare(m['materia.js'].luogoDaAria({ P: M.P }), { P: M.P, stella: stellaPerRisalita(M) }) },
  energiaPerLaChimica: { modulo: 'risalita.js', funzione: 'energiaPerLaChimica', riceve: ['stella.luminosita', 'orbita.distanza', 'stella.temperatura', 'interno.campo', 'aria.pressione', 'pianeta.gravita', 'clima.temperatura', 'pianeta.raggio', 'pianeta.massa', 'stella.eta', 'stella.massa', 'pianeta.giorno', 'pianeta.tipo', 'pianeta.ferro', 'pianeta.bloccato', 'orbita.anno', 'acqua.mare', 'interno.calore', 'interno.tettonica', 'acqua.stato', 'clima.assorbita', 'stella.raggio', 'aria.CO2', 'aria.H2O', 'aria.CH4', 'aria.H2', 'aria.N2'], chiamante: 'cosmo.js sistema', chiama: (M, m) => m['risalita.js'].energiaPerLaChimica(m['materia.js'].luogoDaAria({ P: M.P }), { P: M.P, stella: stellaPerRisalita(M) }) },
  prebiotica: { modulo: 'chimica.js', funzione: 'prebiotica', riceve: ['vita.energia', 'aria.H2', 'aria.CH4', 'aria.CO2', 'aria.N2', 'aria.H2O', 'acqua.stato', 'clima.temperatura', 'aria.pressione', 'aria.riducente', 'pianeta.ferro'], chiamante: 'cosmo.js sistema',
    chiama: (M, m) => { const T = v(M, 'clima.temperatura'), stato = v(M, 'acqua.stato'), atm = M.P.atmosfera; if (!atm) return null;
      return m['chimica.js'].prebiotica({ atmosfera: atm, T, energia: v(M, 'vita.energia'), pressione: v(M, 'aria.pressione'), acqua: stato, minerali: m['chimica.js'].minerali({ composizione: M.P.composizione, T, ossidato: !v(M, 'aria.riducente'), acqua: stato === 'liquida' }) }); } },
  radiceMassima: { modulo: 'albero_vita.js', funzione: 'radiceMassima', chiamante: 'albero_vita.js alberoDelPianeta', chiama: (M, m) => m['albero_vita.js'].radiceMassima(M.P, M.S) },
  // la superficie: dichiarate, non chiamate dalle prove (dieci secondi a pianeta)
  climaSuperficie: { modulo: 'geologia.js', funzione: 'climaSuperficie', chiamante: 'superficie.worker.js', superficie: true },
  meteoPianeta: { modulo: 'meteo.js', funzione: 'meteoPianeta', chiamante: 'geologia.js climaSuperficie', superficie: true },
  erosione: { modulo: 'geologia.js', funzione: 'erosione', chiamante: 'superficie.worker.js', superficie: true },
  mare: { modulo: 'mare.js', funzione: 'mare', chiamante: 'superficie.worker.js', superficie: true },
};

// =====================================================================================================
// 3. LE GRANDEZZE
// =====================================================================================================
// dipende: ['nome'] oppure { da: 'nome', segno: +1 | −1, esp: l'esponente se è una legge di potenza, attesa: true se
// la fisica lo chiede ma il codice (dichiaratamente) non lo ascolta ancora, nota }.
// passo: 'rel' (l'1% è un fattore 1,01) o 'ass' (l'1% dell'intervallo). tipo: 'n' numero, 'c' categoria, 'b' sì/no.
// specie (solo per chi non ha ingressi): 'evento' (esce dalla fonte unica del caso) .
// ciò da cui dipende ogni gas dell'aria: che cosa c'è (l'acqua e i ghiacci arrivati con lei, i metalli della stella), che
// cosa la gravità tiene, e che cosa a quella temperatura gela, piove o finisce nel calcare
// (I METALLI DELLA STELLA non stanno tra questi. Prima non era un filo staccato: i metalli scalavano tutti insieme con un solo
// Z, e carbonio, azoto e zolfo PER UNITÀ D'ACQUA erano gli stessi per ogni stella. Con la catena degli elementi (elementi.js,
// lavoro 8) la miscela di nascita della stella — C/O, N/O che cambiano con la sua età e la sua galassia — decide quanti ne
// portano i ghiacci di ogni suo pianeta: QUESTO FILO MANCA al grafo, perché la miscela non è ancora una grandezza dichiarata
// qui. Z entra da quanta acqua il disco ha dato al pianeta (pianeta.acqua) e, per chi ha il velo di idrogeno, direttamente.)
const ARIA_DA = ['clima.temperatura', 'acqua.stato', 'aria.gasTenuti', 'pianeta.acqua'];
const gasDellAria = (formula, nome, intervallo = [1e-8, 1]) => ({ nome: `aria.${formula}`, descrizione: `la parte di ${nome} nell'aria (in volume)`, unita: '1', livello: 'pianeta', gruppo: 'aria', leggi: `P.atmosfera.gas.${formula}`, seManca: 0,
  fonte: 'atmosfera', esce: `gas.${formula}`, dipende: [...ARIA_DA, ...(formula === 'CO2' ? ['aria.co2Ciclo'] : formula === 'H2' ? ['pianeta.involucro'] : [])], intervallo, passo: 'rel', trascurabile: 1e-6, vale: { 'pianeta.tipo': SOLIDI } });

export const GRANDEZZE = [
  // ---------------------------------------------------------------- cosmo e galassia
  { nome: 'cosmo.picco', descrizione: 'l\'altezza del picco del campo iniziale da cui nasce la galassia', unita: 'σ', livello: 'cosmo', gruppo: 'campo', leggi: 'G.peso', fonte: null, specie: 'evento', dipende: [] },
  { nome: 'galassia.alone', descrizione: 'la massa dell\'alone di materia oscura', unita: 'M☉', livello: 'galassia', gruppo: 'alone', leggi: 'G.forma.alone.massa', fonte: 'massaAlone', esce: '', dipende: [{ da: 'cosmo.picco', segno: 1 }], passo: 'rel' },
  { nome: 'galassia.stelle', descrizione: 'la massa in stelle', unita: 'M☉', livello: 'galassia', gruppo: 'materia', leggi: 'G.forma.massaStelle', fonte: 'formaGalassia', dipende: [{ da: 'galassia.alone', segno: 1 }] },
  { nome: 'galassia.gas', descrizione: 'la massa di gas freddo rimasto', unita: 'M☉', livello: 'galassia', gruppo: 'materia', leggi: 'G.forma.massaGas', fonte: 'formaGalassia', dipende: [{ da: 'galassia.alone', segno: 1 }] },
  { nome: 'galassia.supernove', descrizione: 'il ritmo delle supernove oggi', unita: '1/anno', livello: 'galassia', gruppo: 'materia', leggi: 'G.forma.ritmoSN.totale', fonte: 'formaGalassia', dipende: [{ da: 'galassia.stelle', segno: 1 }, { da: 'galassia.gas', segno: 1 }] },
  // ---------------------------------------------------------------- stella
  { nome: 'stella.massaNascita', descrizione: 'la massa con cui la stella è nata', unita: 'M☉', livello: 'stella', gruppo: 'stella', leggi: { primo: ['S.massaNascita', 'S.massa'] }, fonte: null, specie: 'evento', dipende: [], intervallo: [0.08, 8], passo: 'rel' },
  { nome: 'stella.eta', descrizione: 'gli anni dalla nascita della stella (e del pianeta)', unita: 'anni', livello: 'stella', gruppo: 'stella', leggi: 'S.eta', altrove: ['P.interno.eta'], fonte: null, specie: 'evento', dipende: [], intervallo: [3e7, 1.35e10], passo: 'rel' },
  { nome: 'stella.metalli', descrizione: 'i metalli della stella (Z, il Sole = 1)', unita: 'Z☉', livello: 'stella', gruppo: 'stella', leggi: 'S.Z', fonte: 'stelleGalassia', dipende: [{ da: 'galassia.stelle', segno: 1 }, { da: 'stella.eta', segno: -1 }], intervallo: [0.01, 3.5], passo: 'rel' },
  { nome: 'stella.vita', descrizione: 'quanto dura la sequenza principale', unita: 'anni', livello: 'stella', gruppo: 'stella', leggi: null, soloDallaFonte: true, fonte: 'stellaVita', esce: 'vita', dipende: [{ da: 'stella.massaNascita', segno: -1 }, 'stella.metalli'], passo: 'rel' },
  { nome: 'stella.stato', descrizione: 'in vita, gigante, o ciò che ne resta', unita: 'stato', tipo: 'c', livello: 'stella', gruppo: 'stella', leggi: 'S.stato', fonte: 'stelleGalassia', dipende: ['stella.eta', 'stella.vita', 'stella.massaNascita'], specieCategoria: 'fisica' },
  { nome: 'stella.massa', descrizione: 'la massa di oggi', unita: 'M☉', livello: 'stella', gruppo: 'stella', leggi: 'S.massa', altrove: [{ da: 'P.Mstella', per: 1 / MSOLE }], fonte: 'stelleGalassia', dipende: [{ da: 'stella.massaNascita', segno: 1 }, 'stella.stato'], intervallo: [0.08, 8], passo: 'rel' },
  { nome: 'stella.luminosita', descrizione: 'la luce della stella oggi', unita: 'W', livello: 'stella', gruppo: 'stella', leggi: 'P.Lw', fonte: 'stella', esce: 'L',
    dipende: [{ da: 'stella.massa', segno: 1, esp: 3.5 }, 'stella.metalli', { da: 'stella.eta', segno: 1 }, 'stella.stato'], intervallo: [1e22, 1e29], passo: 'rel' },
  { nome: 'stella.luceDelDisco', descrizione: 'la luce della stella al tempo del suo disco (la stessa grandezza, a un altro tempo: mette la linea della neve)', unita: 'W', livello: 'stella', gruppo: 'stella', leggi: { da: 'Sis.disco.Lstella', per: LSOLE }, fonte: 'stellaAlDisco', esce: { da: 'L', per: LSOLE },
    dipende: [{ da: 'stella.massaNascita', segno: 1 }, 'stella.metalli'], passo: 'rel' },
  { nome: 'disco.neve', descrizione: 'la linea della neve del disco: oltre, anche il ghiaccio è solido', unita: 'UA', livello: 'stella', gruppo: 'stella', leggi: 'Sis.disco.neve', fonte: 'disco', dipende: [{ da: 'stella.luceDelDisco', segno: 1, esp: 0.5 }] },
  { nome: 'stella.temperatura', descrizione: 'la temperatura della superficie della stella', unita: 'K', livello: 'stella', gruppo: 'stella', leggi: 'S.T', altrove: ['P.Tstella'], fonte: 'stella', esce: 'T',
    dipende: [{ da: 'stella.massa', segno: 1 }, 'stella.metalli', 'stella.eta', 'stella.stato'], intervallo: [2500, 12000], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'Tst', nota: 'la temperatura della stella che risalita.js usa per ultravioletto e vento' }] },
  { nome: 'stella.raggio', descrizione: 'il raggio della stella', unita: 'm', livello: 'stella', gruppo: 'stella', leggi: { da: 'S.r', per: LATO }, altrove: ['P.Rstella'], fonte: 'stella', esce: 'R',
    dipende: [{ da: 'stella.massa', segno: 1 }, 'stella.metalli', 'stella.eta', 'stella.stato'], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'Rst', nota: 'il raggio della stella come lo legge risalita.js (da P.Rstella)' }] },
  { nome: 'stella.vento', descrizione: 'la massa che la stella perde col vento', unita: 'kg/s', livello: 'stella', gruppo: 'stella', leggi: null, soloDallaFonte: true, fonte: 'ventoStellare', esce: 'perditaStella', vale: { 'stella.stato': VIVA },
    dipende: [{ da: 'stella.raggio', segno: 1, esp: 2 }, { da: 'stella.eta', segno: -1 }], passo: 'rel' },
  // ---------------------------------------------------------------- orbita
  { nome: 'orbita.distanza', descrizione: 'il semiasse dell\'orbita', unita: 'm', livello: 'pianeta', gruppo: 'orbita', leggi: 'P.aM', altrove: [{ da: 'P.a', per: LATO }], fonte: 'formaPianeti', dipende: [{ da: 'stella.massaNascita', segno: 1 }], intervallo: [0.02 * UA, 60 * UA], passo: 'rel' },
  { nome: 'orbita.eccentricita', descrizione: 'quanto l\'orbita è allungata', unita: '1', livello: 'pianeta', gruppo: 'orbita', leggi: 'P.eccentricita', fonte: 'formaPianeti', dipende: [{ da: 'pianeta.massa', segno: 1 }, 'pianeta.tipo'], intervallo: [0, 0.8], passo: 'ass' },
  { nome: 'orbita.anno', descrizione: 'il periodo dell\'orbita', unita: 's', livello: 'pianeta', gruppo: 'orbita', leggi: 'P.anno', fonte: 'periodo', esce: '', dipende: [{ da: 'orbita.distanza', segno: 1, esp: 1.5 }, { da: 'stella.massa', segno: -1, esp: -0.5 }], intervallo: [1e5, 1e10], passo: 'rel' },
  { nome: 'orbita.flusso', descrizione: 'la luce della stella che arriva al pianeta', unita: 'W/m²', livello: 'pianeta', gruppo: 'orbita', leggi: { da: 'P.clima.bilancio.arriva', per: 4 }, fonte: 'clima', esce: { da: 'bilancio.arriva', per: 4 }, vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'stella.luminosita', segno: 1, esp: 1 }, { da: 'orbita.distanza', segno: -1, esp: -2 }], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'S', nota: 'risalita.js rifà il conto L/(4πa²)' }] },
  // ---------------------------------------------------------------- il corpo del pianeta
  { nome: 'pianeta.massa', descrizione: 'la massa del pianeta', unita: 'kg', livello: 'pianeta', gruppo: 'corpo', leggi: 'P.massaKg', fonte: 'formaPianeti', dipende: [{ da: 'stella.massaNascita', segno: 1 }, { da: 'stella.metalli', segno: 1 }, { da: 'orbita.distanza', segno: 1 }], intervallo: [0.01 * MTERRA, 3000 * MTERRA], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'M', nota: 'la massa come la rilegge risalita.js' }] },
  { nome: 'pianeta.ferro', descrizione: 'la parte di ferro nei solidi', unita: '1', livello: 'pianeta', gruppo: 'corpo', leggi: 'P.composizione.ferro', fonte: 'formaPianeti', dipende: [{ da: 'orbita.distanza', segno: -1 }], vale: { 'pianeta.tipo': SOLIDI }, intervallo: [0.02, 0.7], passo: 'ass' },
  { nome: 'pianeta.acqua', descrizione: 'la parte di acqua (o ghiaccio) nei solidi', unita: '1', livello: 'pianeta', gruppo: 'corpo', leggi: { primo: ['P.composizione.acqua', 'P.composizione.ghiaccio'] }, fonte: 'formaPianeti', dipende: [{ da: 'orbita.distanza', segno: 1 }, 'disco.neve', 'stella.massaNascita'], vale: { 'pianeta.tipo': SOLIDI }, intervallo: [1e-5, 0.8], passo: 'rel',
    controlli: [{ fonte: 'acquaInSuperficie', esce: 'frazione', nota: 'la stessa parte d\'acqua come la legge leggi.js (i rocciosi la chiamano «acqua», i ghiacciati «ghiaccio»)' }] },
  { nome: 'pianeta.involucro', descrizione: 'il velo di idrogeno ed elio rimasto dal disco (parte della massa)', unita: '1', livello: 'pianeta', gruppo: 'corpo', leggi: 'P.involucro', fonte: 'formaPianeti', dipende: ['pianeta.massa', 'orbita.distanza'], intervallo: [1e-4, 0.4], passo: 'rel' },
  { nome: 'pianeta.tipo', descrizione: 'roccioso, ghiacciato o gassoso', unita: 'tipo', tipo: 'c', livello: 'pianeta', gruppo: 'corpo', leggi: 'P.tipo', fonte: 'formaPianeti', dipende: ['pianeta.acqua', 'pianeta.involucro', 'pianeta.massa'], alternative: SOLIDI, specieCategoria: 'comodo' },
  { nome: 'pianeta.raggio', descrizione: 'il raggio del pianeta', unita: 'm', livello: 'pianeta', gruppo: 'corpo', leggi: 'P.raggioM', fonte: 'raggioPianeta', esce: '', vale: { 'stella.stato': VIVA },
    dipende: [{ da: 'pianeta.massa', segno: 1, esp: 0.27 }, { da: 'pianeta.ferro', segno: -1 }, { da: 'pianeta.acqua', segno: 1 }, { da: 'pianeta.involucro', segno: 1 }], intervallo: [1.5e6, 9e7], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'R', nota: 'il raggio come lo rilegge risalita.js' }] },
  { nome: 'pianeta.gravita', descrizione: 'la gravità alla superficie', unita: 'm/s²', livello: 'pianeta', gruppo: 'corpo', leggi: 'P.clima.g', fonte: 'clima', esce: 'g', dipende: [{ da: 'pianeta.massa', segno: 1, esp: 1 }, { da: 'pianeta.raggio', segno: -1, esp: -2 }], intervallo: [0.5, 100], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'g', nota: 'la gravità come la rilegge risalita.js' }] },
  { nome: 'pianeta.giorno', descrizione: 'la durata del giorno', unita: 's', livello: 'pianeta', gruppo: 'rotazione', leggi: 'P.giorno', altrove: ['P.giro.giorno'], fonte: 'rotazione', esce: 'giorno',
    dipende: ['pianeta.massa', 'pianeta.raggio', 'orbita.distanza', 'stella.massa', 'orbita.eccentricita', 'stella.eta', 'pianeta.involucro', 'pianeta.risonanza', 'pianeta.bloccato'], intervallo: [7200, 1e9], passo: 'rel' },
  { nome: 'pianeta.obliquita', descrizione: 'l\'inclinazione dell\'asse', unita: '°', trascurabile: 0.5, livello: 'pianeta', gruppo: 'rotazione', leggi: 'P.obliquita', altrove: ['P.giro.obliquita', 'P.clima.giro.obliquita'], fonte: 'rotazione', esce: 'obliquita',
    dipende: ['pianeta.massa', 'pianeta.raggio', 'orbita.distanza', 'stella.massa', 'stella.eta', 'pianeta.involucro'], intervallo: [0, 90], passo: 'ass' },
  { nome: 'pianeta.bloccato', descrizione: 'mostra sempre la stessa faccia alla stella', unita: 'sì/no', tipo: 'b', livello: 'pianeta', gruppo: 'rotazione', leggi: 'P.bloccato', altrove: ['P.giro.bloccato', 'P.clima.giro.bloccato'], fonte: 'rotazione', esce: 'bloccato',
    dipende: ['pianeta.massa', 'pianeta.raggio', { da: 'orbita.distanza', segno: -1 }, 'stella.massa', 'orbita.eccentricita', { da: 'stella.eta', segno: 1 }, 'pianeta.involucro'], specieCategoria: 'fisica' },
  { nome: 'pianeta.risonanza', descrizione: 'la risonanza tra giorno e anno a cui la marea l\'ha fermato (3:2, 2:1…), se c\'è', unita: 'rapporto', tipo: 'c', livello: 'pianeta', gruppo: 'rotazione', leggi: 'P.risonanza', seManca: 'nessuna', fonte: 'rotazione', esce: 'risonanza',
    dipende: ['orbita.eccentricita'], specieCategoria: 'fisica' },
  { nome: 'pianeta.schiacciamento', descrizione: 'quanto la rotazione lo schiaccia ai poli', unita: '1', livello: 'pianeta', gruppo: 'rotazione', leggi: 'P.schiacciamento', fonte: 'cosmoSistema', dipende: [{ da: 'pianeta.giorno', segno: -1, esp: -2 }, { da: 'pianeta.raggio', segno: 1, esp: 3 }, { da: 'pianeta.massa', segno: -1, esp: -1 }] },
  { nome: 'pianeta.k2Q', descrizione: 'quanto il pianeta dissipa la marea (k₂/Q)', unita: '1', livello: 'pianeta', gruppo: 'rotazione', leggi: null, soloDallaFonte: true, fonte: 'k2QPianeta', esce: '', dipende: ['pianeta.tipo', 'acqua.stato'] },
  { nome: 'pianeta.lune', descrizione: 'quante lune ha', unita: 'numero', livello: 'pianeta', gruppo: 'rotazione', leggi: 'P.lune.length', fonte: 'lune', dipende: [{ da: 'pianeta.massa', segno: 1 }, { da: 'orbita.distanza', segno: 1 }, 'pianeta.tipo'] },
  // ---------------------------------------------------------------- l'interno
  { nome: 'interno.nucleo', descrizione: 'il raggio del nucleo di ferro (parte del raggio)', unita: '1', livello: 'pianeta', gruppo: 'interno', leggi: 'P.interno.nucleo', fonte: 'interno', esce: 'nucleo', vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'pianeta.ferro', segno: 1 }, 'pianeta.massa', 'pianeta.raggio'], intervallo: [0.1, 0.9], passo: 'ass' },
  { nome: 'interno.calore', descrizione: 'il calore che esce dall\'interno', unita: 'W/m²', livello: 'pianeta', gruppo: 'interno', leggi: 'P.interno.q', fonte: 'interno', esce: 'q', vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'pianeta.massa', segno: 1 }, 'pianeta.raggio', { da: 'stella.eta', segno: -1 }, { da: 'stella.metalli', segno: 1 }, 'pianeta.ferro', 'pianeta.acqua', { da: 'orbita.eccentricita', segno: 1, nota: 'il calore della marea della stella' }], intervallo: [1e-3, 10], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'q', nota: 'il calore interno come lo rilegge risalita.js' }] },
  { nome: 'interno.dinamo', descrizione: 'il nucleo è ancora liquido e rimescolato', unita: 'sì/no', tipo: 'b', livello: 'pianeta', gruppo: 'interno', leggi: 'P.interno.dinamo', fonte: 'interno', esce: 'dinamo', dipende: ['interno.calore', 'interno.nucleo', 'pianeta.raggio', 'stella.eta'], specieCategoria: 'fisica' },
  { nome: 'interno.rossby', descrizione: 'il numero di Rossby del nucleo (se la rotazione ordina la dinamo)', unita: '1', livello: 'pianeta', gruppo: 'interno', leggi: 'P.interno.rossby', fonte: 'interno', esce: 'rossby', vale: { 'pianeta.tipo': SOLIDI, 'interno.dinamo': [true] },
    dipende: [{ da: 'interno.calore', segno: 1 }, { da: 'pianeta.giorno', segno: 1, esp: 7 / 6 }, 'interno.nucleo', 'interno.dinamo'], passo: 'rel' },
  { nome: 'interno.dipolo', descrizione: 'il campo è a due poli (se no, a molti e debole)', unita: 'sì/no', tipo: 'b', livello: 'pianeta', gruppo: 'interno', leggi: 'P.interno.dipolo', fonte: 'interno', esce: 'dipolo', vale: { 'pianeta.tipo': SOLIDI, 'interno.dinamo': [true] }, dipende: ['interno.rossby', 'interno.dinamo'], specieCategoria: 'fisica' },
  { nome: 'interno.campo', descrizione: 'il campo magnetico alla superficie', unita: 'T', livello: 'pianeta', gruppo: 'interno', leggi: 'P.B0', altrove: ['P.interno.B0'], fonte: 'interno', esce: 'B0',
    dipende: ['interno.calore', 'interno.nucleo', 'interno.dinamo', 'interno.dipolo', 'pianeta.raggio'], intervallo: [1e-9, 1e-2], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'B0', nota: 'il campo come lo rilegge risalita.js' }] },
  { nome: 'interno.tettonica', descrizione: 'il regime della crosta', unita: 'regime', tipo: 'c', livello: 'pianeta', gruppo: 'interno', leggi: 'P.interno.tettonica', fonte: 'interno', esce: 'tettonica',
    dipende: ['interno.calore', 'pianeta.acqua', 'pianeta.massa', { da: 'clima.temperatura', attesa: true, nota: 'una superficie rovente non fa placche (Venere): la storia termica usa la temperatura della superficie nuda, non quella del clima (storia.js lo dichiara: si può passare con Tsuperficie)' }], specieCategoria: 'comodo' },
  { nome: 'interno.vulcani', descrizione: 'quanti grandi vulcani attivi', unita: 'numero', livello: 'pianeta', gruppo: 'interno', leggi: 'P.interno.vulcani', fonte: 'interno', esce: 'vulcani', dipende: [{ da: 'interno.calore', segno: 1 }, 'interno.tettonica'] },
  { nome: 'marea.potenza', descrizione: 'il calore che la marea della stella deposita nel pianeta', unita: 'W', livello: 'pianeta', gruppo: 'interno', leggi: null, soloDallaFonte: true, fonte: 'storiaTermica', esce: 'Q.marea', vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'orbita.eccentricita', segno: 1 }, { da: 'orbita.distanza', segno: -1 }, { da: 'stella.massa', segno: 1 }, 'pianeta.raggio'], trascurabile: 1e9, passo: 'rel' },
  { nome: 'interno.mantello', descrizione: 'la temperatura del mantello oggi, dalla storia termica', unita: 'K', livello: 'pianeta', gruppo: 'interno', leggi: null, soloDallaFonte: true, fonte: 'storiaTermica', esce: 'Tm', vale: { 'pianeta.tipo': SOLIDI },
    dipende: ['pianeta.massa', 'pianeta.raggio', { da: 'stella.eta', segno: -1 }, 'stella.metalli', 'marea.potenza'], passo: 'rel' },
  { nome: 'interno.mobilita', descrizione: 'quanto la crosta si muove (0 coperchio fermo, 1 placche): la grandezza continua sotto il nome del regime', unita: '1', livello: 'pianeta', gruppo: 'interno', leggi: null, soloDallaFonte: true, fonte: 'storiaTermica', esce: 'crosta.mobilita', vale: { 'pianeta.tipo': SOLIDI },
    dipende: ['interno.mantello', 'pianeta.acqua', 'pianeta.massa'], intervallo: [0, 1], trascurabile: 1e-3, passo: 'ass' },
  { nome: 'interno.magma', descrizione: 'il magma che il mantello produce (i vulcani del ciclo del carbonio)', unita: 'kg/anno', livello: 'pianeta', gruppo: 'interno', leggi: null, soloDallaFonte: true, fonte: 'storiaTermica', esce: 'fuso.kgAnno', vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'interno.mantello', segno: 1 }, 'pianeta.massa', 'pianeta.raggio', 'interno.mobilita'], trascurabile: 1e9, passo: 'rel' },
  { nome: 'interno.argon', descrizione: 'l\'argon del potassio decaduto salito nell\'aria (peso della colonna)', unita: 'Pa', trascurabile: 1e-6, livello: 'pianeta', gruppo: 'interno', leggi: null, soloDallaFonte: true, fonte: 'gasRadiogenici', esce: 'perLAria.Ar', vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'stella.eta', segno: 1 }, 'pianeta.massa', 'pianeta.raggio', 'interno.tettonica', 'stella.luminosita', 'pianeta.ferro'], passo: 'rel' },
  // ---------------------------------------------------------------- l'acqua
  { nome: 'acqua.inSuperficie', descrizione: 'l\'acqua che sta in superficie', unita: 'kg', livello: 'pianeta', gruppo: 'acqua', leggi: 'P.interno.acquaKg', fonte: 'acquaInSuperficie', esce: 'kg', dipende: [{ da: 'pianeta.massa', segno: 1, esp: 1 }, { da: 'pianeta.acqua', segno: 1, esp: 1 }, 'pianeta.tipo'], intervallo: [1e15, 1e26], passo: 'rel' },
  { nome: 'acqua.stato', descrizione: 'ghiaccio, liquida, vapore', unita: 'stato', tipo: 'c', livello: 'pianeta', gruppo: 'acqua', leggi: 'P.clima.acqua', fonte: 'clima', esce: 'acqua',
    dipende: ['clima.temperatura', 'aria.pressione', 'clima.assorbita'], alternative: ['ghiaccio', 'liquida', 'vapore'], specieCategoria: 'fisica',
    controlli: [{ fonte: 'statoAcqua', esce: '', vale: { 'pianeta.tipo': SOLIDI }, nota: 'lo stato che la legge di fase dà da sola con T e p medie (clima() aggiunge il limite del vapore, e climaEAria tiene «vapore» ai mondi che l\'acqua l\'hanno persa)' }] },
  { nome: 'acqua.mare', descrizione: 'la parte del pianeta coperta dal mare', unita: '1', trascurabile: 1e-3, livello: 'pianeta', gruppo: 'acqua', leggi: 'P.clima.mare', fonte: 'clima', esce: 'mare', vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'acqua.inSuperficie', segno: 1 }, { da: 'pianeta.raggio', segno: -1 }, 'interno.tettonica', 'acqua.stato'], intervallo: [0, 1], passo: 'ass',
    controlli: [{ fonte: 'mareAtteso', esce: '', vale: { 'pianeta.tipo': SOLIDI, 'acqua.stato': ['ghiaccio', 'liquida'] }, nota: 'il mare atteso dalla sola quantità d\'acqua, dove l\'acqua non è vapore' }, { fonte: 'mondoDiRisalita', esce: 'mare', vale: { 'pianeta.tipo': SOLIDI }, nota: 'il mare come lo rilegge risalita.js' }] },
  { nome: 'acqua.ghiaccio', descrizione: 'la parte del pianeta coperta dal ghiaccio', unita: '1', trascurabile: 1e-2, livello: 'pianeta', gruppo: 'acqua', leggi: 'P.clima.ghiaccio', altrove: ['P.clima.ghiaccioDelCiclo'], tolleranza: { assoluta: 10 * mChimica.CICLO.ghiaccio, perche: 'il ghiaccio messo nel ciclo del carbonio coincide con quello del clima entro la tolleranza dichiarata del punto fisso (chimica.js CICLO)' }, fonte: 'clima', esce: 'ghiaccio', vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'clima.temperatura', segno: -1 }, 'acqua.mare'], intervallo: [0, 1], passo: 'ass' },
  { nome: 'acqua.ebollizione', descrizione: 'a che temperatura bolle l\'acqua a quella pressione', unita: 'K', livello: 'pianeta', gruppo: 'acqua', leggi: null, soloDallaFonte: true, fonte: 'ebollizione', esce: '', vale: { 'pianeta.tipo': SOLIDI }, dipende: [{ da: 'aria.pressione', segno: 1 }], passo: 'rel' }, // (mare.js aveva una sua ebollizione(): ora legge questa)
  // ---------------------------------------------------------------- l'aria
  { nome: 'aria.gasTenuti', descrizione: 'quante specie di gas la gravità trattiene (su sei)', unita: 'numero', livello: 'pianeta', gruppo: 'aria', leggi: 'P.clima.tenuti.length', fonte: 'clima', esce: 'tenuti.length',
    dipende: [{ da: 'pianeta.massa', segno: 1 }, { da: 'pianeta.raggio', segno: -1 }, { da: 'stella.luminosita', segno: -1 }, { da: 'orbita.distanza', segno: 1 }] },
  { nome: 'aria.pressione', descrizione: 'la pressione dell\'aria al suolo', unita: 'Pa', trascurabile: 1e-3, livello: 'pianeta', gruppo: 'aria', leggi: 'P.clima.pressione', altrove: ['P.atmosfera.pressione'], fonte: 'atmosfera', esce: 'pressione', vale: { 'pianeta.tipo': SOLIDI },
    dipende: [...ARIA_DA, { da: 'pianeta.massa', segno: 1 }, 'pianeta.raggio', 'pianeta.involucro', 'aria.co2Ciclo', 'interno.argon', { da: 'stella.vento', segno: -1, attesa: true, nota: 'l\'aria che il vento della stella porta via (risalita.js la calcola: ariaPersa; nessuno la toglie)' }], intervallo: [1, 1e9], passo: 'rel' },
  { nome: 'aria.livello', descrizione: 'il livello di riferimento di un gigante di gas (non ha un suolo: lì si calcolano miscela e chimica)', unita: 'Pa', livello: 'pianeta', gruppo: 'aria', leggi: 'P.clima.livello', altrove: ['P.atmosfera.pressione'], fonte: 'clima', esce: 'livello', vale: { 'pianeta.tipo': ['gassoso'] }, dipende: ['pianeta.tipo'] },
  gasDellAria('CO2', 'anidride carbonica'), gasDellAria('H2O', 'vapore d\'acqua'), gasDellAria('CH4', 'metano'), gasDellAria('H2', 'idrogeno'), gasDellAria('N2', 'azoto'),
  { nome: 'aria.riducente', descrizione: 'l\'aria cede idrogeno (riducente) o lo prende (ossidante)', unita: 'sì/no', tipo: 'b', livello: 'pianeta', gruppo: 'aria', leggi: 'P.atmosfera.riducente', fonte: 'atmosfera', esce: 'riducente', dipende: ['aria.H2', 'aria.CH4', 'aria.CO2', 'aria.H2O', 'aria.gasTenuti'], specieCategoria: 'comodo' },
  { nome: 'aria.serra', descrizione: 'lo spessore ottico dell\'aria per l\'infrarosso (τ)', unita: '1', trascurabile: 1e-6, livello: 'pianeta', gruppo: 'aria', leggi: 'P.clima.tau', fonte: 'serra', esce: { da: '', tetto: 1e4 }, vale: { 'pianeta.tipo': SOLIDI },
    dipende: [{ da: 'aria.CO2', segno: 1, esp: 0.39 }, { da: 'aria.H2O', segno: 1 }, { da: 'aria.CH4', segno: 1 }, 'aria.H2', 'aria.N2', { da: 'aria.pressione', segno: 1 }, { da: 'pianeta.gravita', segno: -1 }, 'clima.temperatura'], intervallo: [1e-3, 1e4], passo: 'rel' },
  { nome: 'aria.co2Ciclo', descrizione: 'la CO₂ a cui le rocce ne prendono quanta i vulcani ne danno', unita: 'Pa', trascurabile: 1e-3, livello: 'pianeta', gruppo: 'aria', leggi: 'P.clima.co2Ciclo', fonte: 'co2DelCiclo', esce: '', vale: { 'pianeta.tipo': SOLIDI, 'acqua.stato': ['liquida'] },
    dipende: [{ da: 'clima.temperatura', segno: -1 }, { da: 'interno.magma', segno: 1 }, 'interno.vulcani', { da: 'acqua.mare', segno: 1 }, { da: 'acqua.ghiaccio', segno: 1 }, 'interno.tettonica'], passo: 'rel' },
  { nome: 'aria.vaporeSaturo', descrizione: 'la pressione del vapore d\'acqua sopra il mare o il ghiaccio', unita: 'Pa', livello: 'pianeta', gruppo: 'aria', leggi: null, soloDallaFonte: true, fonte: 'vaporeSaturo', esce: '', vale: { 'pianeta.tipo': SOLIDI }, dipende: [{ da: 'clima.temperatura', segno: 1 }], passo: 'rel', trascurabile: 1e-3,
    controlli: [{ fonte: 'pressioneVapore', esce: '', nota: 'chimica.js ha una sua pressione di vapore (dalle tabelle termodinamiche): è quella che decide quanta acqua sta nell\'aria' }] },
  // ---------------------------------------------------------------- il clima
  { nome: 'clima.temperatura', descrizione: 'la temperatura media alla superficie', unita: 'K', livello: 'pianeta', gruppo: 'clima', leggi: 'P.clima.T', altrove: ['P.clima.Taria'], tolleranza: { assoluta: 1, perche: 'Taria è la temperatura a cui climaEAria ha fatto la chimica dell\'aria: è la stessa grandezza un giro prima, e il risolutore si ferma quando le due distano meno di un grado' }, fonte: 'clima', esce: 'T',
    dipende: [{ da: 'orbita.flusso', segno: 1, esp: 0.25 }, { da: 'clima.albedo', segno: -1 }, { da: 'aria.serra', segno: 1 }, 'clima.trasporto', 'pianeta.obliquita', 'pianeta.bloccato', { da: 'stella.luminosita', segno: 1, esp: 0.25 }, { da: 'orbita.distanza', segno: -1, esp: -0.5 }], intervallo: [30, 2500], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'Ts', nota: 'la temperatura della superficie come la rilegge risalita.js' }] },
  { nome: 'clima.equilibrio', descrizione: 'la temperatura che avrebbe senz\'aria, con il suo albedo', unita: 'K', livello: 'pianeta', gruppo: 'clima', leggi: 'P.clima.Teq', fonte: 'clima', esce: 'Teq', dipende: [{ da: 'orbita.flusso', segno: 1, esp: 0.25 }, { da: 'clima.albedo', segno: -1 }, { da: 'stella.luminosita', segno: 1, esp: 0.25 }, { da: 'orbita.distanza', segno: -1, esp: -0.5 }], passo: 'rel',
    controlli: [{ fonte: 'temperaturaEquilibrio', esce: '', nota: 'la formula di leggi.js con l\'albedo che il pianeta dichiara' }, { fonte: 'mondoDiRisalita', esce: 'Teq', nota: 'come la rilegge risalita.js' }] },
  { nome: 'clima.albedo', descrizione: 'la parte di luce rimandata indietro', unita: '1', livello: 'pianeta', gruppo: 'clima', leggi: 'P.clima.albedo', fonte: 'clima', esce: 'albedo', dipende: [{ da: 'acqua.ghiaccio', segno: 1 }, { da: 'clima.nuvole', segno: 1 }, 'acqua.mare', 'clima.temperatura'], intervallo: [0, 0.9], passo: 'ass' },
  { nome: 'clima.nuvole', descrizione: 'la parte di cielo coperta', unita: '1', trascurabile: 1e-3, livello: 'pianeta', gruppo: 'clima', leggi: 'P.clima.nuvole', fonte: 'clima', esce: 'nuvole', vale: { 'pianeta.tipo': SOLIDI }, dipende: [{ da: 'acqua.mare', segno: 1 }, { da: 'aria.pressione', segno: 1 }], intervallo: [0, 1], passo: 'ass' },
  { nome: 'clima.trasporto', descrizione: 'il calore che aria e mare portano dal caldo al freddo', unita: 'W/m²/K', trascurabile: 1e-6, livello: 'pianeta', gruppo: 'clima', leggi: 'P.clima.D', fonte: 'clima', esce: 'D', vale: { 'pianeta.tipo': SOLIDI }, dipende: ['aria.pressione', 'pianeta.giorno', 'pianeta.raggio', 'pianeta.gravita', 'clima.temperatura'], passo: 'rel' },
  { nome: 'clima.vento', descrizione: 'il vento al suolo, dalla stessa legge dell\'aria', unita: 'm/s', livello: 'pianeta', gruppo: 'clima', leggi: 'P.clima.vento', fonte: 'clima', esce: 'vento', vale: { 'pianeta.tipo': SOLIDI },
    dipende: ['aria.pressione', 'pianeta.giorno', 'pianeta.raggio', 'pianeta.gravita', 'clima.temperatura'], passo: 'rel' },
  { nome: 'clima.assorbita', descrizione: 'la luce che il pianeta assorbe, in media', unita: 'W/m²', livello: 'pianeta', gruppo: 'clima', leggi: 'P.clima.bilancio.assorbita', fonte: 'clima', esce: 'bilancio.assorbita', vale: { 'pianeta.tipo': SOLIDI }, dipende: [{ da: 'orbita.flusso', segno: 1, esp: 1 }, { da: 'clima.albedo', segno: -1 }], passo: 'rel',
    controlli: [{ fonte: 'mondoDiRisalita', esce: 'assorbita', nota: 'come la rilegge risalita.js' }] },
  // ---------------------------------------------------------------- lo spazio vicino e i mattoni della vita
  { nome: 'spazio.magnetopausa', descrizione: 'fin dove il campo ferma il vento della stella (raggi del pianeta)', unita: 'raggi', livello: 'pianeta', gruppo: 'spazio', leggi: 'P.magnetopausa', fonte: 'ventoStellare', esce: 'magnetopausa', vale: { 'stella.stato': VIVA },
    dipende: [{ da: 'interno.campo', segno: 1, esp: 1 / 3 }, { da: 'stella.vento', segno: -1, esp: -1 / 6 }, { da: 'orbita.distanza', segno: 1, esp: 1 / 3 }], passo: 'rel' },
  { nome: 'vita.energia', descrizione: 'l\'energia che arriva alla chimica dell\'aria (la Terra = 1)', unita: 'Terra', trascurabile: 1e-6, livello: 'pianeta', gruppo: 'vita', leggi: 'P.energiaChimica.relativa', fonte: 'energiaPerLaChimica', esce: 'relativa', vale: { 'stella.stato': VIVA },
    dipende: [{ da: 'stella.luminosita', segno: 1 }, { da: 'orbita.distanza', segno: -1 }, { da: 'stella.temperatura', segno: 1 }, 'interno.campo', 'aria.pressione', 'stella.vento'], intervallo: [1e-4, 1e3], passo: 'rel' },
  { nome: 'vita.HCN', descrizione: 'quanto rende lì la reazione che fa acido cianidrico', unita: '1', trascurabile: 1e-6, livello: 'pianeta', gruppo: 'vita', leggi: 'P.prebiotica.HCN', fonte: 'prebiotica', esce: 'HCN', dipende: [{ da: 'vita.energia', segno: 1, esp: 1 }, 'aria.H2', 'aria.CH4', 'aria.CO2', 'aria.N2', 'aria.H2O'], passo: 'rel' },
  { nome: 'vita.formaldeide', descrizione: 'quanto rende lì la reazione che fa formaldeide (zuccheri)', unita: '1', trascurabile: 1e-6, livello: 'pianeta', gruppo: 'vita', leggi: 'P.prebiotica.formaldeide', fonte: 'prebiotica', esce: 'formaldeide', dipende: [{ da: 'vita.energia', segno: 1, esp: 1 }, 'aria.H2', 'aria.CH4', 'aria.CO2', 'aria.N2', 'aria.H2O'], passo: 'rel' },
  { nome: 'vita.autocatalisi', descrizione: 'gli zuccheri si copiano da soli (formosio)', unita: 'sì/no', tipo: 'b', livello: 'pianeta', gruppo: 'vita', leggi: 'P.prebiotica.autocatalisi', fonte: 'prebiotica', esce: 'autocatalisi', dipende: ['vita.formaldeide', 'acqua.stato'], specieCategoria: 'comodo' },
  { nome: 'vita.radiceMassima', descrizione: 'l\'età più antica che l\'albero della vita può avere', unita: 'Ma', livello: 'pianeta', gruppo: 'vita', leggi: null, soloDallaFonte: true, fonte: 'radiceMassima', esce: 'Ma', dipende: ['acqua.stato', { da: 'stella.eta', segno: 1, esp: 1 }], passo: 'rel' },
  // ---------------------------------------------------------------- la superficie (dichiarata; fuori dal campione)
  { nome: 'superficie.temperatura', descrizione: 'la carta delle temperature', unita: 'K', tipo: 'campo', livello: 'superficie', gruppo: 'clima', leggi: 'U.cl.media', campione: false, fonte: 'climaSuperficie', dipende: ['clima.temperatura', 'aria.serra', 'clima.trasporto', 'orbita.flusso', 'pianeta.obliquita', 'pianeta.bloccato', 'meteo.nuvole'] },
  { nome: 'meteo.pioggia', descrizione: 'la carta delle piogge', unita: 'mm/anno', tipo: 'campo', livello: 'superficie', gruppo: 'meteo', leggi: 'U.cl.meteo.pioggia', campione: false, fonte: 'meteoPianeta', dipende: ['superficie.temperatura', 'aria.pressione', 'pianeta.giorno', 'pianeta.gravita', 'pianeta.raggio', 'pianeta.bloccato', 'pianeta.obliquita', 'acqua.stato'] },
  { nome: 'meteo.nuvole', descrizione: 'la carta delle nuvole', unita: '1', tipo: 'campo', livello: 'superficie', gruppo: 'meteo', leggi: 'U.cl.meteo.nuvole', campione: false, fonte: 'meteoPianeta', dipende: ['superficie.temperatura', 'aria.pressione', 'pianeta.giorno', 'pianeta.gravita', 'acqua.stato'] },
  { nome: 'superficie.denudazione', descrizione: 'quanto l\'erosione abbassa le terre', unita: 'm/anno', livello: 'superficie', gruppo: 'erosione', leggi: 'U.se.denudazione', campione: false, fonte: 'erosione', dipende: [{ da: 'meteo.pioggia', segno: 1 }, 'interno.tettonica', 'pianeta.gravita'] },
  { nome: 'superficie.fango', descrizione: 'il sedimento che i fiumi portano al mare', unita: 'kg/anno', livello: 'superficie', gruppo: 'erosione', leggi: 'U.se.fangoAlMare', campione: false, fonte: 'erosione', dipende: [{ da: 'superficie.denudazione', segno: 1 }, 'pianeta.raggio'] },
  { nome: 'mare.frazione', descrizione: 'la parte del pianeta sotto il mare, sulla carta vera', unita: '1', livello: 'superficie', gruppo: 'mare', leggi: 'U.mare.frazioneMare', campione: false, fonte: 'mare', dipende: [{ da: 'acqua.inSuperficie', segno: 1 }, 'pianeta.raggio', 'interno.tettonica', 'acqua.stato'] },
  { nome: 'mare.pCO2', descrizione: 'la CO₂ con cui il mare è in equilibrio', unita: 'bar', livello: 'superficie', gruppo: 'mare', leggi: 'U.mare.pCO2', campione: false, fonte: 'mare', dipende: ['aria.CO2', 'aria.pressione', 'aria.co2Ciclo', 'interno.calore', 'superficie.denudazione'] },
  { nome: 'mare.salinita', descrizione: 'i sali sciolti nel mare', unita: 'g/kg', livello: 'superficie', gruppo: 'mare', leggi: 'U.mare.salinitaMedia', campione: false, fonte: 'mare', dipende: [{ da: 'acqua.inSuperficie', segno: -1 }, 'superficie.fango', 'superficie.denudazione', 'interno.calore', 'stella.eta'] },
  { nome: 'mare.pH', descrizione: 'l\'acidità del mare', unita: 'pH', livello: 'superficie', gruppo: 'mare', leggi: 'U.mare.pH', campione: false, fonte: 'mare', dipende: [{ da: 'mare.pCO2', segno: -1 }, 'mare.salinita', 'superficie.temperatura'] },
  { nome: 'mare.calcite', descrizione: 'la saturazione del calcare nel mare', unita: 'Ω', tipo: 'campo', livello: 'superficie', gruppo: 'mare', leggi: 'U.mare.saturazione.calcite', campione: false, fonte: 'mare', dipende: [{ da: 'mare.pH', segno: 1 }, 'mare.salinita', 'superficie.temperatura'] },
];

// =====================================================================================================
// 4. I CICLI DICHIARATI
// =====================================================================================================
// Un ciclo non è un errore se qualcuno lo chiude cercando il punto in cui le grandezze tornano uguali a sé stesse.
export const CICLI = [
  { nome: 'ghiaccio-albedo', perche: 'più freddo, più ghiaccio e (con un mare) altre nuvole, più luce rimandata, più freddo; lo stato dell\'acqua decide se il mare c\'è', chiude: 'clima',
    salta: 'il ghiaccio e l\'albedo hanno due stati stabili (palla di neve, mare aperto): passando dall\'uno all\'altro tutte le grandezze del ciclo saltano insieme (fisica vera: Budyko); ma può saltare anche il conto, che parte da una temperatura scelta',
    membri: ['clima.temperatura', 'acqua.ghiaccio', 'clima.albedo', 'clima.assorbita', 'acqua.stato', 'acqua.mare', 'clima.nuvole', 'clima.equilibrio', 'clima.trasporto', 'clima.vento'] },
  { nome: 'clima-aria', perche: 'la temperatura decide che cosa gela, piove o finisce nel calcare; l\'aria che resta decide la serra, e la serra la temperatura', chiude: 'climaEAria',
    salta: 'clima e aria hanno più stati stabili (gelato, con il mare, senz\'acqua) e il risolutore li prova in un ordine: passando dall\'uno all\'altro tutte le grandezze del ciclo saltano insieme. Non si distingue qui il salto vero (il mare che bolle) dal risolutore che cambia ramo',
    membri: ['clima.temperatura', 'acqua.stato', 'acqua.mare', 'acqua.ghiaccio', 'aria.pressione', 'aria.CO2', 'aria.H2O', 'aria.CH4', 'aria.H2', 'aria.N2', 'aria.riducente', 'aria.serra', 'aria.co2Ciclo', 'clima.trasporto', 'clima.vento', 'clima.nuvole', 'clima.albedo', 'clima.assorbita', 'clima.equilibrio', 'interno.argon'] },
  { nome: 'clima-meteo', perche: 'le nuvole e i venti veri cambiano la temperatura della carta, che cambia nuvole e venti (il secondo giro di climaSuperficie)', chiude: 'climaSuperficie',
    membri: ['superficie.temperatura', 'meteo.nuvole', 'meteo.pioggia'] },
];
// le grandezze che il risolutore di un ciclo riceve da fuori e quelle che restituisce (lette dal suo risultato)
export const RISOLUTORI = {
  climaEAria: {
    // (in ordine di peso: se il tempo della prova finisce, i primi sono quelli misurati)
    ingressi: ['stella.luminosita', 'interno.calore', 'orbita.distanza', 'pianeta.massa', 'pianeta.acqua', 'pianeta.tipo', 'interno.tettonica', 'pianeta.bloccato', 'pianeta.giorno', 'pianeta.raggio', 'acqua.inSuperficie', 'pianeta.obliquita', 'orbita.anno', 'pianeta.involucro', 'stella.metalli', 'stella.eta'],
    uscite: { 'clima.temperatura': 'clima.T', 'acqua.stato': 'clima.acqua', 'aria.pressione': 'clima.pressione', 'aria.serra': 'clima.tau', 'clima.albedo': 'clima.albedo', 'acqua.mare': 'clima.mare', 'acqua.ghiaccio': 'clima.ghiaccio', 'aria.CO2': 'atmosfera.gas.CO2', 'aria.H2O': 'atmosfera.gas.H2O', 'aria.CH4': 'atmosfera.gas.CH4', 'aria.H2': 'atmosfera.gas.H2', 'aria.N2': 'atmosfera.gas.N2', 'clima.assorbita': 'clima.bilancio.assorbita', 'aria.gasTenuti': 'clima.tenuti.length' },
  },
};

// =====================================================================================================
// 5. LE SOGLIE: dove il codice salta, e di che specie è il salto
// =====================================================================================================
// su: la grandezza che, attraversando «a», fa saltare qualcosa (a: un numero, una funzione del mondo, o null = «quando
// cambia»). specie: 'fisica' (la natura salta lì) | 'comodo' (un taglio nostro). dove: { modulo, cerca } (la riga si
// trova cercando quel testo: se il codice si sposta la riga si aggiorna da sola; se sparisce, la prova lo dice).
// fonti (se c'è): la soglia vale solo dentro quelle fonti.
export const SOGLIE = [
  { su: 'clima.temperatura', a: ZERO_CELSIUS, specie: 'fisica', perche: 'l\'acqua gela (transizione di fase)', dove: { modulo: 'leggi.js', cerca: 'return T < 273.15 ?' } },
  { su: 'clima.temperatura', a: (M) => mLeggi.ebollizione(valore('aria.pressione', M)), specie: 'fisica', perche: 'l\'acqua bolle a quella pressione (transizione di fase)', dove: { modulo: 'leggi.js', cerca: 'T < ebollizione(P)' } },
  { su: 'clima.temperatura', a: 647, specie: 'fisica', perche: 'il punto critico dell\'acqua: liquido e vapore non si distinguono più', dove: { modulo: 'leggi.js', cerca: 'T >= ACQUA.critica' } },
  { su: 'aria.pressione', a: 611, specie: 'fisica', perche: 'il punto triplo dell\'acqua: sotto, niente liquido', dove: { modulo: 'leggi.js', cerca: 'P < ACQUA.tripla' } },
  { su: 'clima.temperatura', a: 200, specie: 'comodo', perche: 'sotto il punto triplo il ghiaccio «sublima» sopra 200 K: un numero di taglio al posto della pressione di vapore del ghiaccio', dove: { modulo: 'leggi.js', cerca: 'T < 200 ?' }, sanare: 'confrontare la pressione di vapore del ghiaccio (vaporeSaturo) con la pressione dell\'aria' },
  { su: 'clima.assorbita', a: 282, specie: 'fisica', perche: 'il limite del vapore: un\'aria satura non irradia più di 282 W/m², e il mare evapora tutto (il numero è quello dei modelli per la Terra)', dove: { modulo: 'leggi.js', cerca: 'b.assorbita > LIMITE_VAPORE' } },
  { su: 'clima.temperatura', a: 268, specie: 'fisica', perche: 'la neve e il ghiaccio coprono la terra (268 K) e il mare (266 K): il salto dell\'albedo è vero, ma il gelo ha qui un terzo e un quarto numero oltre a 273,15 e 271', dove: { modulo: 'leggi.js', cerca: 'geloTerra: 268' } },
  { su: 'acqua.mare', a: 0.02, specie: 'comodo', perche: 'le nuvole attese ci sono solo se il mare copre più del 2%', dove: { modulo: 'leggi.js', cerca: 'mare > 0.02' }, sanare: 'far crescere le nuvole con l\'evaporazione vera (mare × pressione di vapore), senza soglia' },
  { su: 'aria.pressione', a: 1e4, specie: 'comodo', perche: 'le nuvole attese ci sono solo sopra 0,1 bar', dove: { modulo: 'leggi.js', cerca: 'pressione > 1e4' }, sanare: 'una legge continua della pressione (quanta acqua l\'aria regge)' },
  { su: 'aria.gasTenuti', a: null, specie: 'comodo', perche: 'un gas resta o fugge con un taglio netto del parametro di Jeans a 25; la fuga vera è continua (esponenziale)', dove: { modulo: 'leggi.js', cerca: '> 25;' }, sanare: 'il flusso di fuga di Jeans integrato sull\'età, al posto del sì/no' },
  { su: 'aria.serra', a: 1e4, specie: 'comodo', perche: 'oltre τ = 10⁴ la serra non cresce più (dichiarato: lì il calore sale per convezione)', dove: { modulo: 'leggi.js', cerca: 'Math.min(1e4, aria ? aria.tau' }, sanare: 'il gradiente adiabatico sotto il livello dove l\'aria diventa opaca' },
  { su: 'pianeta.tipo', a: null, specie: 'comodo', perche: 'tre tipi di pianeta decidono troppo: acqua tutta fuori o al 4%, clima a parte per i giganti, k₂/Q, interno; la composizione continua c\'è già', dove: { modulo: 'disco.js', cerca: 'const tipo = gas > 0.5' }, sanare: 'usare le frazioni di gas e di ghiaccio (continue) al posto del nome del tipo' },
  { su: 'pianeta.acqua', a: 0.2, specie: 'comodo', perche: 'oltre un quinto di ghiaccio il pianeta è «ghiacciato»', dove: { modulo: 'disco.js', cerca: 'ghiaccio > 0.2' }, sanare: 'come sopra' },
  // (l'interno viene dalla storia termica, storia.js: i sei tagli che interno() aveva — calore sopra 0,025, 0,05, 0,02,
  // raggio sopra 3500 km, acqua sopra 0,005, massa sopra 0,3 Terre — non ci sono più)
  { su: 'interno.dinamo', a: null, specie: 'fisica', perche: 'la dinamo si accende o si spegne: il galleggiamento nel nucleo è positivo e il Reynolds magnetico passa 50 (soglia della teoria); spenta, il campo è il fondo di 10⁻⁹ T', dove: { modulo: 'storia.js', cerca: 'Rem > S.reynoldsMagnetico' } },
  { su: 'interno.rossby', a: 0.12, specie: 'fisica', perche: 'sopra Ro = 0,12 la dinamo perde il dipolo (soglia misurata nelle simulazioni: Olson e Christensen 2006); di quanto cala il campo (dieci volte) è però scelto', dove: { modulo: 'storia.js', cerca: 'rossby > STORIA.rossby.soglia' } },
  { su: 'interno.dipolo', a: null, specie: 'fisica', perche: 'la dinamo perde il dipolo (vedi Rossby): il campo alla superficie cala di dieci volte', dove: { modulo: 'storia.js', cerca: 'dipolo ? 1 : STORIA.rossby.senzaDipolo' } },
  { su: 'interno.tettonica', a: null, specie: 'comodo', perche: 'il regime della crosta è un nome messo sulla mobilità (continua, da 0 a 1) tagliata a 0,5, e sul «fonde / non fonde»', fonti: ['interno'], dove: { modulo: 'storia.js', cerca: 'aPlacche = mob > 0.5' }, sanare: 'far uscire da interno() la mobilità e la massa che fonde (storia.js le ha già) e farle leggere a chi oggi legge il nome' },
  { su: 'interno.vulcani', a: null, specie: 'comodo', perche: 'i vulcani si contano a interi (uno ogni 0,02 W/m², convenzione rimasta) e almeno uno appena il mantello fonde: il primo accende di colpo il ciclo del carbonio in cosmo.js', dove: { modulo: 'storia.js', cerca: 'Math.round(q / STORIA.vulcaniPerFlusso)' }, sanare: 'passare a climaEAria la massa che fonde (o il calore) così com\'è, senza l\'interruttore «vulcani > 0»' },
  { su: 'interno.tettonica', a: null, specie: 'comodo', perche: 'il regime della crosta è un nome: il rilievo atteso (2 km o mezzo), i continenti del ciclo del carbonio e la parte degassata saltano con lui', fonti: ['clima', 'climaEAria', 'co2DelCiclo', 'mareAtteso', 'gasRadiogenici'], dove: { modulo: 'leggi.js', cerca: 'placche ? CLIMA.rilievoPlacche' }, sanare: 'la mobilità della crosta (continua) al posto del nome' },
  { su: 'acqua.stato', a: null, specie: 'fisica', perche: 'lo stato dell\'acqua cambia (fase): con lui cambiano il mare, l\'aria (ciò che piove o resta), k₂/Q', dove: { modulo: 'leggi.js', cerca: 'export function statoAcqua' } },
  { su: 'pianeta.bloccato', a: null, specie: 'fisica', perche: 'il blocco mareale è uno stato vero: la luce cade sempre sulla stessa faccia', dove: { modulo: 'rotazione.js', cerca: 'bloccato: fermo' } },
  { su: 'aria.H2', a: 0.01, specie: 'comodo', perche: 'con più dell\'1% di idrogeno l\'idrogeno «non manca mai» per la formaldeide; e l\'aria è «riducente» solo se ne cede più dell\'1%', dove: { modulo: 'chimica.js', cerca: '(gas.H2 || 0) > 0.01' }, sanare: 'contare l\'idrogeno libero come gli altri ingredienti' },
  { su: 'aria.riducente', a: null, specie: 'comodo', perche: 'riducente sì/no: decide se i minerali sono ossidati', dove: { modulo: 'chimica.js', cerca: 'riducente: rid > oss' }, sanare: 'usare il potere riducente (0…1), che c\'è già' },
  { su: 'vita.formaldeide', a: 0.01, specie: 'comodo', perche: 'la soglia del formosio (gli zuccheri si copiano) è un numero scelto', dove: { modulo: 'chimica.js', cerca: 'SOGLIA_FORMOSIO' }, sanare: 'la rete di reazioni vera (molecole_rete.js) al posto della soglia' },
  { su: 'spazio.magnetopausa', a: 1.3, specie: 'comodo', perche: 'sotto 1,3 raggi il pianeta è «scoperto» al vento', dove: { modulo: 'risalita.js', cerca: 'magnetopausa < 1.3' }, sanare: 'la parte di superficie che il vento raggiunge, continua' },
  { su: 'stella.stato', a: null, specie: 'fisica', perche: 'la stella finisce l\'idrogeno e muore; ma «gigante» comincia a 0,9 della vita con la temperatura tagliata a 4200 K (di comodo)', dove: { modulo: 'galassie.js', cerca: 'eta > 0.9 * vita' } },
  { su: 'stella.massaNascita', a: (M) => mStelle.massaMinima({ Z: valore('stella.metalli', M) ?? 1 }), specie: 'fisica', perche: 'sotto la massa minima l\'idrogeno non si accende: è una nana bruna, e la sua «vita» è infinita', dove: { modulo: 'stelle.js', cerca: 'return nanaBruna(Msol, righe, eta)' } },
  { su: 'stella.massa', a: (M) => mStelle.massaMinima({ Z: valore('stella.metalli', M) ?? 1 }), specie: 'fisica', perche: 'sotto la massa minima l\'idrogeno non si accende: è una nana bruna (luce e raggio seguono un\'altra legge)', dove: { modulo: 'stelle.js', cerca: 'return nanaBruna(Msol, righe, eta)' } },
  { su: 'pianeta.risonanza', a: null, specie: 'fisica', perche: 'la rotazione resta agganciata a una risonanza con l\'orbita (1:1, 3:2, 2:1…, come Mercurio): al crescere dell\'eccentricità passa dall\'una all\'altra e il giorno salta', dove: { modulo: 'rotazione.js', cerca: 'Math.round(2 * equilibrio) / 2' } },
  { su: 'interno.magma', a: 0, specie: 'fisica', perche: 'il mantello comincia a fondere (passa il solidus): da lì ci sono magma e vulcani', dove: { modulo: 'storia.js', cerca: 'fonde = Mfuso > 0' } },
  { su: 'interno.vulcani', a: 0, specie: 'comodo', perche: 'il ciclo del carbonio si accende solo se interno() conta almeno un vulcano: prima di quello il calore dell\'interno non entra nel clima', fonti: ['co2DelCiclo', 'climaEAria'], dove: { modulo: 'cosmo.js', cerca: 'p.interno.vulcani > 0 ? p.interno.q : 0' }, sanare: 'passare a climaEAria il calore (o la massa che fonde) così com\'è' },
  { su: 'pianeta.involucro', a: 0.01, specie: 'comodo', perche: 'con più dell\'1% di gas il giro del pianeta è «dato dal gas», sotto «dagli urti»: giorno e asse saltano', dove: { modulo: 'rotazione.js', cerca: 'gasMinimo: 0.01' }, sanare: 'sommare i due momenti angolari (gas e urti) pesati, invece di sceglierne uno' },
  { su: 'interno.argon', a: 0, specie: 'comodo', perche: 'l\'argon resta tutto o fugge tutto: lo stesso taglio di Jeans a 25, rifatto in risalita.js', dove: { modulo: 'risalita.js', cerca: 'tieneAr = ' }, sanare: 'come per i gas tenuti: il flusso di fuga integrato sull\'età' },
  { su: 'aria.co2Ciclo', a: 1e7, specie: 'comodo', perche: 'oltre cento bar di CO₂ il conto del ciclo si ferma', dove: { modulo: 'chimica.js', cerca: 'prende(100) < fonte' }, sanare: 'cercare l\'equilibrio anche oltre' },
];

// =====================================================================================================
// 6. I NUMERI CHE HANNO GIÀ UN NOME
// =====================================================================================================
// Chi scrive a mano uno di questi numeri in mezzo a una formula ha un filo in meno. `motivo`: l'espressione regolare
// che lo riconosce in una riga di codice; `casa`: il modulo dove è definito (lì non conta).
export const NUMERI_CON_FONTE = [
  { nome: 'G', che: 'la costante di gravità', casa: ['leggi.js'], fonte: 'leggi.js COSTANTI.G', motivo: /\b6\.674\d*e-11\b/ },
  { nome: 'σ', che: 'la costante di Stefan-Boltzmann', casa: ['leggi.js'], fonte: 'leggi.js COSTANTI.sigma', motivo: /\b5\.670?\d*e-8\b/ },
  { nome: 'kB', che: 'la costante di Boltzmann', casa: ['leggi.js'], fonte: 'leggi.js COSTANTI.kB', motivo: /\b1\.38\d*e-23\b/ },
  { nome: 'c', che: 'la velocità della luce', casa: ['leggi.js'], fonte: 'leggi.js COSTANTI.c', motivo: /\b2\.99\d*e8\b|\b299792458\b/ },
  { nome: 'R', che: 'la costante dei gas', casa: ['leggi.js'], fonte: 'leggi.js R_GAS', motivo: /\b8\.314\d*\b/ },
  { nome: 'M☉', che: 'la massa del Sole', casa: ['leggi.js'], fonte: 'leggi.js MSOLE', motivo: /\b1\.98[89]\d*e30\b/ },
  { nome: 'R☉', che: 'il raggio del Sole', casa: ['leggi.js'], fonte: 'leggi.js RSOLE', motivo: /\b6\.95[57]\d*e8\b/ },
  { nome: 'L☉', che: 'la luce del Sole', casa: ['leggi.js'], fonte: 'leggi.js LSOLE', motivo: /\b3\.82[68]\d*e26\b/ },
  { nome: 'UA', che: 'l\'unità astronomica', casa: ['leggi.js'], fonte: 'leggi.js UA', motivo: /\b1\.49[56]\d*e11\b/ },
  { nome: 'anno', che: 'i secondi di un anno', casa: ['leggi.js'], fonte: 'leggi.js ANNO', motivo: /\b3\.15[56]\d*e7\b/ },
  { nome: 'M⊕', che: 'la massa della Terra', casa: ['disco.js'], fonte: 'disco.js MTERRA', motivo: /\b5\.97\d*e24\b/ },
  { nome: 'R⊕', che: 'il raggio della Terra', casa: ['disco.js'], fonte: 'disco.js RTERRA', motivo: /\b6\.371\d*e6\b/ },
  { nome: 'gelo', che: 'il punto di fusione del ghiaccio (273,15 K; comprende le righe dove serve solo a convertire i gradi Celsius)', casa: [], fonte: 'leggi.js statoAcqua (273,15 K: non ha ancora un nome)', grandezza: 'clima.temperatura', motivo: /\b273\.15\b|\b273\.16\b|< 271\b/ },
  { nome: 'T Terra', che: 'la temperatura della Terra come valore di riserva', casa: [], fonte: 'grafo: clima.temperatura (P.clima.T)', grandezza: 'clima.temperatura', motivo: /(?<![\d.e])288(?![\d.])/ },
  { nome: 'età Terra', che: 'l\'età del Sistema Solare come valore di riserva', casa: [], fonte: 'grafo: stella.eta (S.eta)', grandezza: 'stella.eta', motivo: /\b4\.5e9\b/ },
  { nome: 'q Terra', che: 'il calore interno della Terra come valore di riserva', casa: ['geologia.js', 'tettonica.js'], fonte: 'grafo: interno.calore (P.interno.q)', grandezza: 'interno.calore', motivo: /\b0\.087\b/ },
  { nome: 'B Terra', che: 'il campo magnetico della Terra come valore di riserva', casa: ['geologia.js'], fonte: 'grafo: interno.campo (P.B0)', grandezza: 'interno.campo', motivo: /\b3\.1e-5\b/ },
  { nome: 'g Terra', che: 'la gravità della Terra come valore di riserva', casa: [], fonte: 'grafo: pianeta.gravita (P.clima.g)', grandezza: 'pianeta.gravita', motivo: /\b9\.81\b/ },
  { nome: 'S Terra', che: 'la luce del Sole alla Terra', casa: [], fonte: 'grafo: orbita.flusso', grandezza: 'orbita.flusso', motivo: /(?<![\d.])136[17](?![\d.])/ },
  { nome: 'giorno Terra', che: 'il giorno della Terra come valore di riserva', casa: ['storia.js'], fonte: 'grafo: pianeta.giorno (P.giorno)', grandezza: 'pianeta.giorno', motivo: /(?:\?\?|\|\||giorno:) 86400\b|\b86164\b/ },
  { nome: 'albedo 0,3', che: 'l\'albedo della Terra come valore di riserva', casa: [], fonte: 'grafo: clima.albedo (P.clima.albedo)', grandezza: 'clima.albedo', motivo: /albedo[^;\n]{0,24}\?\? 0\.3\b|, 0\.3\)(?=.*temperaturaEquilibrio)|temperaturaEquilibrio\([^)]*, 0\.3\)/ },
  { nome: '1 bar', che: 'la pressione della Terra come valore di riserva', casa: [], fonte: 'grafo: aria.pressione (P.clima.pressione)', grandezza: 'aria.pressione', motivo: /pressione[^;\n]{0,30}\?\? 1e5\b/ },
];

// LE FORMULE CHE HANNO GIÀ UNA FONTE: grandezze del grafo ricalcolate in linea, con la formula riscritta, invece che
// lette dalla fonte. `motivo` riconosce la formula in una riga; `casa`: dove è giusto che stia.
export const FORMULE_CON_FONTE = [
  { grandezza: 'pianeta.gravita', che: 'G·M/R²', casa: ['leggi.js'], motivo: /(?:\bG|G_N|6\.674e-11|COSTANTI\.G) \* [A-Za-z_.?]*(?:massaKg|\bM\b)\)? \/ \(?[A-Za-z_.?]*(?:raggioM|\bR\b) ?(?:\*\* 2|\* [A-Za-z_.?]*(?:raggioM|R)\b)/ },
  { grandezza: 'orbita.flusso', che: 'L/(4πa²)', casa: ['leggi.js'], motivo: /L[w]? \/ \(4 \* Math\.PI \* \(?[A-Za-z_.() *0-9]*a[MU]?[A-Za-z]* ?(?:\*\* 2|\* )/ },
  { grandezza: 'orbita.anno', che: '2π√(a³/GM)', casa: ['orbite.js'], motivo: /2 \* (?:Math\.)?PI \* Math\.sqrt\([A-Za-z_.]*a[A-Za-z]* \*\* 3 \/ \(/ },
  { grandezza: 'stella.raggio', che: '√(L/4πσT⁴)', casa: ['stelle.js'], motivo: /Math\.sqrt\(L[w]? \/ \(4 \* Math\.PI \* [A-Za-z_.]+ \* [A-Za-z_.]+ \*\* 4/ },
  { grandezza: 'stella.luminosita', che: '4πR²σT⁴', casa: ['stelle.js'], motivo: /4 \* Math\.PI \* [A-Za-z_.]+ \*\* 2 \* [A-Za-z_.]*sigma \* [A-Za-z_.]+ \*\* 4/ },
  { grandezza: 'clima.equilibrio', che: 'la temperatura di equilibrio con albedo 0,3 fisso', casa: [], motivo: /temperaturaEquilibrio\([^)]*, 0\.3\)/ },
];

// I DOPPIONI DICHIARATI: lo stesso dato scritto in due moduli senza che uno legga l'altro, fuori dal campione dei
// pianeti. `posti`: dove sta scritto ({ modulo, cerca }) e quanto vale lì. La prova li stampa, la mappa li elenca.
export const DOPPIONI_DICHIARATI = [
  { che: 'quanto dura il resto di una supernova (anni)', posti: [{ modulo: 'risalita.js', cerca: 'VITA_RESTO: 3e4', valore: '3·10⁴' }, { modulo: 'galassie.js', cerca: 'sedov: [2.9e4', valore: '2,9·10⁴·(n / 10⁶ m⁻³)^(−9/17)' }],
    sanare: 'risalita.js legga LEGGI.sedov di galassie.js con la densità del gas del posto (cambia i numeri del 3% e li fa dipendere dal gas: va misurato)' },
  { che: 'il ritmo delle supernove e il raggio del disco della Via Lattea, come riserva quando la galassia non è nota', posti: [{ modulo: 'risalita.js', cerca: 'SN_VIA_LATTEA: 0.02, RAGGIO_VIA_LATTEA: 15e3', valore: '0,02 all\'anno; 15 000 parsec' }, { modulo: 'materia.js', cerca: '(ritmo / 0.02) / (R / (15 * 3.0857e19))', valore: '0,02 all\'anno; 15 kpc (in linea)' }],
    sanare: 'un nome solo (in galassie.js, accanto a LEGGI: la Via Lattea di riferimento), letto da risalita.js e da materia.js: il valore è lo stesso' },
  { che: 'l\'energia di una supernova che va in raggi cosmici (J)', posti: [{ modulo: 'risalita.js', cerca: 'ENERGIA_SN_COSMICI: 1e43', valore: '10⁴³' }, { modulo: 'galassie.js', cerca: 'cosmici: 0.1', valore: '0,1 × energiaSN (10⁴⁴) = 1,0000000000000001·10⁴³' }],
    sanare: 'leggere LEGGI.cosmici × LEGGI.energiaSN: cambia l\'ultima cifra (10⁻¹⁶)' },
  { che: 'la densità di energia dei raggi cosmici della galassia quando non è nota (J/m³)', posti: [{ modulo: 'risalita.js', cerca: 'COSMICI_GALASSIA: 1.602e-13', valore: '1,602·10⁻¹³ (1 eV/cm³, scritto)' }, { modulo: 'vuoto_mezzo.js', cerca: 'export function raggiCosmiciIn(forma)', valore: '1,70·10⁻¹³ (lo spettro di materia.js integrato) × il cielo relativo della galassia' }],
    sanare: 'dove la galassia è nota risalita.js legge già vuoto_mezzo.js; la riserva scritta (1 eV/cm³) è il 6% sotto il valore che lo spettro dà per la Via Lattea: farla coincidere' },
  { che: 'la temperatura di una nana bianca che si raffredda (Mestel)', posti: [{ modulo: 'stelle.js', cerca: 'export function nanaBiancaOggi', valore: 'la funzione' }, { modulo: 'galassie.js', cerca: 'Math.pow((8.8e6 * Math.pow(f.massa, 5 / 7))', valore: 'la stessa formula in linea (stesso numero)' }],
    sanare: 'galassie.js stelleGalassia chiami stelle.js nanaBiancaOggi(f.massa, f.raggio, morta).T' },
  { che: 'la linea della neve per le lune (2,7 UA·√L)', posti: [{ modulo: 'disco.js', cerca: 'const neve = 2.7 * Math.sqrt(L)', valore: 'con la luce al tempo del disco, su quella del Sole di allora' }, { modulo: 'lune.js', cerca: '2.7 * UA * Math.sqrt(Lgiovane)', valore: 'con la luce a metà della vita della stella: il 18% più vicina per una nana rossa' }],
    sanare: 'lune.js legga la neve (o la luce) dal disco del sistema' },
];

// LE DIPENDENZE MANCANTI SEGNALATE: grandezze che dovrebbero entrare in una formula e non ci entrano, fuori dal
// campione dei pianeti (quelle dentro il campione sono gli archi «attesi» delle grandezze). La prova le misura una per una.
export const DIPENDENZE_MANCANTI = [
  { chiave: 'radiazione', da: 'la densità di radiazione Ω_r (fotoni e neutrini: da leggi.js COSMO.Tcmb e COSMO.Neff)', a: 'il tempo cosmico di galassie.js (U.tempo: l\'età dell\'universo a un dato redshift)',
    nota: 'U.tempo conta solo materia ed energia oscura: ai redshift alti, dove la radiazione pesa, dà un\'età troppo lunga', dove: { modulo: 'galassie.js', cerca: 'tempo = (a) =>' },
    sanare: 'integrare dt = da/(a·H) con H² = H0²·(Ωm/a³ + Ω_r/a⁴ + ΩΛ), con Ω_r da COSMO.Tcmb e COSMO.Neff (ragnatela.js lo fa già per conto suo)' },
];

// =====================================================================================================
// 7. L'INDICE e la coerenza del grafo
// =====================================================================================================
const PER_NOME = new Map(GRANDEZZE.map((g) => [g.nome, g]));
export const grandezza = (nome) => PER_NOME.get(nome) || null;
export const tipoDi = (g) => g.tipo || 'n';
const arcoDi = (g, d) => (typeof d === 'string' ? { da: d, a: g.nome } : { ...d, a: g.nome });
// gli archi: { da, a, segno?, esp?, attesa?, nota?, forse?, specie: 'legge' | 'storia' | 'superficie' | 'in linea' }.
// DETTI (in «dipende» della grandezza): la dipendenza che la fisica vuole. POSSIBILI (`forse`): la fonte riceve
// quell'ingresso (FONTI[…].riceve) ma per questa uscita nessuno ha detto che conti: la prova lo misura, e ciò che non
// muove l'uscita semplicemente non è un arco. Un arco DETTO che non muove l'uscita è invece un filo staccato.
export function archi() {
  const out = [];
  for (const g of GRANDEZZE) { const F = g.fonte ? FONTI[g.fonte] : null, specie = !F ? 'evento' : F.storia ? 'storia' : F.superficie ? 'superficie' : F.inLinea ? 'in linea' : 'legge';
    const detti = new Set(); for (const d of g.dipende || []) { const a = arcoDi(g, d); detti.add(a.da); out.push({ ...a, specie, fonte: g.fonte }); }
    // ciò che la fonte riceve e che per questa uscita non è stato detto: archi «possibili» (la prova dice quali contano)
    if (F?.riceve) { const uscite = new Set(GRANDEZZE.filter((q) => q.fonte === g.fonte).map((q) => q.nome)); for (const x of F.riceve) if (!detti.has(x) && x !== g.nome && !uscite.has(x)) out.push({ da: x, a: g.nome, specie, fonte: g.fonte, forse: true }); } }
  return out;
}
// le grandezze che una fonte restituisce
export const usciteDi = (fonte) => GRANDEZZE.filter((g) => g.fonte === fonte);
// le componenti fortemente connesse (Tarjan): i cicli veri del grafo
export function componenti() {
  const adj = new Map(GRANDEZZE.map((g) => [g.nome, []])); for (const a of archi()) if (adj.has(a.da) && !a.attesa && !a.forse) adj.get(a.da).push(a.a); // (gli archi «attesi» non sono ancora nel codice, quelli «possibili» non sono ancora misurati: non chiudono cicli)
  let i = 0; const idx = new Map(), low = new Map(), pila = [], sulla = new Set(), out = [];
  const visita = (n) => { idx.set(n, i); low.set(n, i); i++; pila.push(n); sulla.add(n);
    for (const w of adj.get(n)) { if (!idx.has(w)) { visita(w); low.set(n, Math.min(low.get(n), low.get(w))); } else if (sulla.has(w)) low.set(n, Math.min(low.get(n), idx.get(w))); }
    if (low.get(n) === idx.get(n)) { const c = []; let w; do { w = pila.pop(); sulla.delete(w); c.push(w); } while (w !== n); out.push(c); } };
  for (const g of GRANDEZZE) if (!idx.has(g.nome)) visita(g.nome);
  return out;
}
// i livelli: 0 chi non dipende da niente, poi chi dipende solo dai livelli sotto (i cicli stanno insieme in un livello)
export function livelli() {
  const comp = componenti(), di = new Map(); comp.forEach((c, k) => c.forEach((n) => di.set(n, k)));
  const A = archi().filter((a) => PER_NOME.has(a.da) && !a.attesa && !a.forse), prof = new Map();
  const profondita = (k, via = new Set()) => { if (prof.has(k)) return prof.get(k); if (via.has(k)) return 0; via.add(k); let p = 0;
    for (const a of A) if (di.get(a.a) === k && di.get(a.da) !== k) p = Math.max(p, 1 + profondita(di.get(a.da), via)); prof.set(k, p); return p; };
  const out = []; comp.forEach((c, k) => { const p = profondita(k); (out[p] ||= []).push(...c); });
  return out.map((l) => (l || []).sort((a, b) => GRANDEZZE.indexOf(PER_NOME.get(a)) - GRANDEZZE.indexOf(PER_NOME.get(b))));
}
// gli antenati di una grandezza (tutto ciò da cui dipende, anche lontano)
export function antenati(nome, soloVeri = false) {
  const A = archi().filter((a) => !(soloVeri && a.attesa)), visti = new Set(), coda = [nome];
  while (coda.length) { const n = coda.pop(); for (const a of A) if (a.a === n && !visti.has(a.da)) { visti.add(a.da); coda.push(a.da); } }
  visti.delete(nome); return visti;
}
// LA COERENZA DEL GRAFO: ciò che deve far fallire la prova. → [{ che, dove }] (vuoto: il grafo sta in piedi)
export function coerenza() {
  const guai = [], visti = new Set();
  for (const g of GRANDEZZE) {
    if (visti.has(g.nome)) guai.push({ che: 'nome ripetuto', dove: g.nome }); visti.add(g.nome);
    for (const k of ['nome', 'unita', 'livello', 'descrizione']) if (!g[k]) guai.push({ che: `manca «${k}»`, dove: g.nome });
    if (g.fonte == null) { if (g.specie !== 'evento' || (g.dipende || []).length) guai.push({ che: 'grandezza senza fonte (e non dichiarata come evento)', dove: g.nome }); }
    else if (!FONTI[g.fonte]) guai.push({ che: `la fonte «${g.fonte}» non è in FONTI`, dove: g.nome });
    if (g.leggi == null && !g.soloDallaFonte) guai.push({ che: 'non dice come leggerla (né «soloDallaFonte»)', dove: g.nome });
    if (g.soloDallaFonte && !(g.fonte && FONTI[g.fonte]?.chiama)) guai.push({ che: '«soloDallaFonte» ma la fonte non si può chiamare', dove: g.nome });
    for (const d of g.dipende || []) { const da = typeof d === 'string' ? d : d.da; if (!PER_NOME.has(da)) guai.push({ che: `dipende da «${da}», che non è nel grafo`, dove: g.nome }); if (da === g.nome) guai.push({ che: 'dipende da sé stessa', dove: g.nome }); }
    for (const c of g.controlli || []) if (c.fonte && !FONTI[c.fonte]) guai.push({ che: `il controllo «${c.fonte}» non è in FONTI`, dove: g.nome });
    for (const x of (g.fonte && FONTI[g.fonte]?.riceve) || []) if (!PER_NOME.has(x)) guai.push({ che: `la fonte «${g.fonte}» riceve «${x}», che non è nel grafo`, dove: g.nome });
    for (const k in g.vale || {}) if (!PER_NOME.has(k)) guai.push({ che: `«vale» nomina «${k}», che non è nel grafo`, dove: g.nome });
  }
  for (const [k, F] of Object.entries(FONTI)) { const mod = MODULI[F.modulo];
    if (!mod) guai.push({ che: `il modulo ${F.modulo} non è tra i MODULI`, dove: `fonte ${k}` });
    else if (typeof mod[F.funzione] !== 'function') guai.push({ che: `${F.modulo} non esporta più la funzione «${F.funzione}»`, dove: `fonte ${k}` });
    if (!F.chiama && !F.storia && !F.inLinea && !F.superficie) guai.push({ che: 'fonte senza «chiama» e non dichiarata storia / in linea / superficie', dove: `fonte ${k}` }); }
  // i cicli: ogni componente con più di una grandezza deve stare dentro i cicli dichiarati
  const dichiarati = new Set(CICLI.flatMap((c) => c.membri));
  for (const c of CICLI) { if (!FONTI[c.chiude]) guai.push({ che: `il ciclo «${c.nome}» è chiuso da «${c.chiude}», che non è in FONTI`, dove: c.nome }); for (const n of c.membri) if (!PER_NOME.has(n)) guai.push({ che: `il ciclo nomina «${n}», che non è nel grafo`, dove: c.nome }); }
  for (const c of componenti()) if (c.length > 1) { const fuori = c.filter((n) => !dichiarati.has(n)); if (fuori.length) guai.push({ che: `ciclo non dichiarato tra ${c.length} grandezze`, dove: fuori.join(', ') }); }
  for (const s of SOGLIE) if (!PER_NOME.has(s.su)) guai.push({ che: `una soglia nomina «${s.su}», che non è nel grafo`, dove: s.perche });
  for (const [k, R] of Object.entries(RISOLUTORI)) for (const n of [...R.ingressi, ...Object.keys(R.uscite)]) if (!PER_NOME.has(n)) guai.push({ che: `il risolutore ${k} nomina «${n}», che non è nel grafo`, dove: k });
  return guai;
}

// =====================================================================================================
// 8. IL MONDO VERO: leggere, scrivere, ricalcolare
// =====================================================================================================
// il mondo di un indirizzo: il pianeta e la stella come li dà sistema() (lo stesso M di bolle.js), il sistema, la galassia
export function mondo(n, gid, sid, pid) {
  const Sis = mCosmo.sistema(n, gid, sid), P = Sis.pianeti[pid]; if (!P) return null;
  return { via: { cosmo: n, galassia: gid, stella: sid, pianeta: pid }, P, S: Sis.stella, Sis, G: mCosmo.cosmo(n).galassie[gid] };
}
// (l'indirizzo scritto del mondo, nella forma di lingua.js: in un cosmo parallelo i rami in fondo, non nel nome del cosmo)
export const indirizzoDi = (M) => scriviIndirizzo(daVia(M.via));
// UN CAMPIONE DI MONDI VERI, dalla fonte unica degli eventi (a grappoli, come bolle.js: fare una galassia costa, un
// sistema poco): `galassie` galassie di `cosmi` cosmi, `sistemi` stelle con pianeti per galassia, tutti i loro pianeti
// (`basta(mondi)`: chi ha i minuti contati si ferma prima; l'ordine dei sistemi resta lo stesso)
export function campioneDiMondi({ cosmi = 2, galassie = 10, sistemi = 5, etichetta = 'campione', basta = null } = {}) {
  const serie = mEventi.sorgente('grandezze').serie(etichetta), out = [], visti = new Set();
  // (a giri: prima una stella per galassia, poi la seconda…: chi si ferma presto ha comunque galassie diverse)
  for (let j = 0; j < sistemi; j++) {
    for (let k = 0; k < galassie; k++) {
      const n = 1 + Math.floor(serie(3 * k) * cosmi), C = mCosmo.cosmo(n), g = Math.floor(serie(3 * k + 1) * C.galassie.length);
      let st = Math.floor(serie(1e6 + 100 * k + j) * mCosmo.STELLE), Sis = mCosmo.sistema(n, g, st);
      for (let giri = 0; (!Sis.pianeti.length || visti.has(`${n}|${g}|${st}`)) && giri < mCosmo.STELLE; giri++) { st = (st + 1) % mCosmo.STELLE; Sis = mCosmo.sistema(n, g, st); }
      if (!Sis.pianeti.length) continue; visti.add(`${n}|${g}|${st}`);
      for (let p = 0; p < Sis.pianeti.length; p++) out.push(mondo(n, g, st, p));
      if (basta && basta(out)) return out;
    }
  }
  return out;
}
// il valore di una grandezza in un mondo (undefined se lì non c'è)
export function valore(nome, M) {
  const g = typeof nome === 'string' ? PER_NOME.get(nome) : nome; if (!g) throw new Error(`grandezze: «${nome}» non è nel grafo`);
  for (const p of postiDi(g).primi) { const x = daPercorso(M, p.da); if (x !== undefined && x !== null) return typeof x === 'number' ? x * p.per : x; }
  return g.seManca;
}
// si può scrivere (per farla variare)? No se il programma non la tiene, se sta sulla superficie, o se è un conteggio
export const siScrive = (nome) => { const g = PER_NOME.get(nome); return !!g && !!g.leggi && g.campione !== false && !g.soloDallaFonte && !postiDi(g).primi.some((p) => p.da.endsWith('.length')); };
// le copie della stessa grandezza nell'oggetto: [{ dove, valore }] (la prima è quella da cui si legge)
export function copie(nome, M) { const g = PER_NOME.get(nome), { primi, copie: c } = postiDi(g), out = [];
  for (const p of [...primi.slice(0, 1), ...c]) { const x = daPercorso(M, p.da); if (x !== undefined && x !== null) out.push({ dove: p.da, valore: typeof x === 'number' ? x * p.per : x }); } return out; }
// lo stesso mondo con UNA grandezza cambiata (tutte le sue copie), e tutto il resto fermo; l'originale non si tocca
export function conValore(M, nome, x) {
  const g = PER_NOME.get(nome); if (!g) throw new Error(`grandezze: «${nome}» non è nel grafo`);
  const { primi, copie: c } = postiDi(g), N = copia(M); let scritto = false;
  const dove = primi.find((p) => daPercorso(M, p.da) != null) || primi[0]; if (!dove) return N;
  for (const p of [dove, ...c]) scritto = scriviPercorso(N, p.da, typeof x === 'number' ? x / p.per : x) || scritto;
  if (scritto && N.S !== M.S && N.Sis) { N.Sis = copia(N.Sis); N.Sis.stella = N.S; } // (il sistema vede la stessa stella)
  return N;
}
// la fonte si applica a questo mondo?
export const valePer = (cond, M) => { for (const k in cond || {}) if (!cond[k].includes(valore(k, M))) return false; return true; };
const applica = (r, esce) => { if (r == null) return undefined; const e = esce == null || typeof esce === 'string' ? { da: esce || '', per: 1 } : esce; let x = daPercorso(r, e.da); if (typeof x === 'number') { x *= e.per ?? 1; if (e.tetto != null) x = Math.min(e.tetto, x); } return x; };
// chiama una fonte nel mondo M → il suo risultato grezzo (lancia se la funzione non c'è più)
export function chiama(fonte, M) {
  const F = FONTI[fonte]; if (!F) throw new Error(`grandezze: la fonte «${fonte}» non è in FONTI`); if (!F.chiama) throw new Error(`grandezze: la fonte «${fonte}» non si può chiamare (${F.storia ? 'storia' : F.inLinea ? 'in linea' : 'superficie'})`);
  if (typeof MODULI[F.modulo]?.[F.funzione] !== 'function') throw new Error(`grandezze: ${F.modulo} non esporta «${F.funzione}»`);
  return F.chiama(M, MODULI);
}
// la grandezza ricalcolata dalla sua fonte, con gli ingressi letti dal mondo → il valore (undefined se non si può)
export function ricalcola(nome, M, risultato = undefined) {
  const g = PER_NOME.get(nome); if (!g?.fonte || !FONTI[g.fonte].chiama) return undefined;
  const x = applica(risultato === undefined ? chiama(g.fonte, M) : risultato, g.esce); return x == null ? g.seManca : x;
}
// tutte le grandezze che una fonte dà, da una chiamata sola → { nome: valore }
export function uscite(fonte, M) {
  const o = {}; let r;
  try { r = chiama(fonte, M); } catch (e) { return { errore: e.message }; }
  const R = RISOLUTORI[fonte];
  if (R) { for (const n in R.uscite) { const x = daPercorso(r, R.uscite[n]); o[n] = x == null ? PER_NOME.get(n).seManca : x; } return o; }
  for (const g of usciteDi(fonte)) { const x = applica(r, g.esce); o[g.nome] = x == null ? g.seManca : x; }
  return o;
}

// =====================================================================================================
// 9. FAR VARIARE UN INGRESSO: la scansione
// =====================================================================================================
// l'intervallo entro cui una grandezza può variare: quello dichiarato, o quello dato (dal campione)
export const intervalloDi = (nome, riserva = null) => PER_NOME.get(nome).intervallo || riserva;
const passoDi = (g, lo, hi) => (g.passo === 'ass' || !(lo > 0) ? 'ass' : 'rel');
// quanto dista x2 da x1 in «passi dell'1%»: per i passi relativi ln(x2/x1)/ln(1,01), per gli assoluti (x2−x1)/(1% dell'intervallo)
export const passi = (x1, x2, modo, lo, hi) => (modo === 'rel' ? Math.abs(Math.log(x2 / x1)) / Math.log(1.01) : Math.abs(x2 - x1) / (0.01 * (hi - lo)));
// il salto tra due valori di un'uscita: per un numero |Δ| / max(|v1|, |v2|) (0…1; 2 se cambia segno), per una categoria 0 o Infinity
export function salto(v1, v2) {
  if (typeof v1 === 'number' && typeof v2 === 'number') { if (v1 === v2) return 0; if (!isFinite(v1) || !isFinite(v2)) return isFinite(v1) === isFinite(v2) ? 0 : Infinity; const m = Math.max(Math.abs(v1), Math.abs(v2)); return m > 0 ? Math.abs(v2 - v1) / m : 0; }
  return v1 === v2 || (v1 == null && v2 == null) ? 0 : Infinity;
}
// il salto, misurato rispetto ad almeno `zero` (la scala sotto cui una grandezza non conta: un gas a una parte su un
// miliardo, un asse inclinato di un decimillesimo di grado): passare da 0 a 10⁻¹² non è «il 100%»
export const saltoSopra = (v1, v2, zero = 0) => (zero > 0 && typeof v1 === 'number' && typeof v2 === 'number' && isFinite(v1) && isFinite(v2) ? Math.abs(v2 - v1) / Math.max(Math.abs(v1), Math.abs(v2), zero) : salto(v1, v2));
// LA SCANSIONE: fa variare la grandezza `x` nel mondo M lungo [lo, hi] (tutto il resto fermo) e legge le uscite della
// fonte. Prima a passi larghi (`larghi` punti), poi dimezzando dove un'uscita salta di più, fino a passi dell'1%
// (e oltre, fino a `fine` di passo: se il salto resta è un gradino, se si scioglie è una salita ripida).
// → { x, modo, lo, hi, punti: [{ x, o: { nome: valore } }] ordinati, salti: { nome: { a1, aFine, x1, x2, v1, v2, gradino } } }
export function scansione(fonte, x, M, { lo, hi, larghi = 48, raffina = 2, fine = 1e-3, soloUscite = null, massimo = Infinity } = {}) {
  const g = PER_NOME.get(x), I = g.intervallo || [lo, hi]; lo = lo ?? I[0]; hi = hi ?? I[1];
  const modo = passoDi(g, lo, hi), punto = (t) => (modo === 'rel' ? lo * Math.pow(hi / lo, t) : lo + (hi - lo) * t), fatti = new Map(), punti = [];
  // (ogni valore di x si calcola una volta: uscite diverse saltano quasi sempre nello stesso posto)
  const calcola = (xx) => { let p = fatti.get(xx); if (!p) { p = { x: xx, o: uscite(fonte, conValore(M, x, xx)) }; fatti.set(xx, p); punti.push(p); } return p; };
  for (let k = 0; k <= larghi; k++) calcola(punto(k / larghi));
  const griglia = punti.slice();
  const nomi = (soloUscite || Object.keys(griglia[0].o)).filter((n) => n !== 'errore'), salti = {};
  const mezzo = (a, b) => (modo === 'rel' ? Math.sqrt(a * b) : 0.5 * (a + b)), zero = (n) => PER_NOME.get(n)?.trascurabile ?? 0, sal = (n, a, b) => saltoSopra(a, b, zero(n));
  // gli intervalli larghi dove ogni uscita salta di più; si stringono in ordine di salto (i più grossi per primi),
  // finché le chiamate concesse (`massimo`) non finiscono: allora ciò che resta è detto «non stretto»
  const daStringere = [];
  for (const n of nomi) { const ord = []; for (let k = 0; k < griglia.length - 1; k++) { const s = sal(n, griglia[k].o[n], griglia[k + 1].o[n]); if (s > 0) ord.push({ n, s, A: griglia[k], B: griglia[k + 1] }); }
    ord.sort((p, q) => q.s - p.s); daStringere.push(...ord.slice(0, raffina)); salti[n] = { a1: 0, aFine: 0, gradino: false }; }
  daStringere.sort((p, q) => q.s - p.s);
  for (const { n, A: A0, B: B0 } of daStringere) {
    let A = A0, B = B0, a1 = null, stretto = true;
    for (let giro = 0; giro < 40; giro++) {
      const w = passi(A.x, B.x, modo, lo, hi);
      if (a1 === null && w <= 1) a1 = { s: sal(n, A.o[n], B.o[n]), A, B };
      if (w <= fine) break;
      const xm = mezzo(A.x, B.x); if (!fatti.has(xm) && punti.length >= massimo) { stretto = false; break; }
      const C = calcola(xm);
      if (sal(n, A.o[n], C.o[n]) >= sal(n, C.o[n], B.o[n])) B = C; else A = C;
    }
    const w = passi(A.x, B.x, modo, lo, hi), sFine = sal(n, A.o[n], B.o[n]);
    // (se non si è arrivati al passo dell'1%, il salto «a un passo» è stimato in proporzione: è un minimo se è un gradino)
    const r = { a1: a1 ? a1.s : sFine === Infinity ? Infinity : Math.min(sFine, sFine / Math.max(1, w)), aFine: sFine, x1: A.x, x2: B.x, v1: A.o[n], v2: B.o[n], stretto, passi: w,
      unPasso: a1 ? { x1: a1.A.x, x2: a1.B.x, v1: a1.A.o[n], v2: a1.B.o[n] } : null, // (i due punti a un passo dell'1%: per le salite ripide il salto si vede lì)
      gradino: stretto || a1 ? sFine === Infinity || (!!a1 && a1.s > 0 && sFine >= 0.5 * a1.s && sFine > 1e-6) : sFine === Infinity };
    if (r.a1 > salti[n].a1) salti[n] = r;
  }
  punti.sort((p, q) => p.x - q.x);
  return { x, fonte, modo, lo, hi, punti, salti };
}

// =====================================================================================================
// 10. DAL BASSO: che cosa un valore osservato impone a chi sta sopra
// =====================================================================================================
// `osservato`: [min, max] per un numero, un valore o una lista di valori per una categoria o un sì/no.
const dentro = (y, oss) => (Array.isArray(oss) && typeof oss[0] === 'number' && oss.length === 2 && typeof y === 'number' ? y >= oss[0] && y <= oss[1] : Array.isArray(oss) ? oss.includes(y) : y === oss);
// IMPONE: tra i valori dell'ingresso `x` (lungo il suo intervallo fisico, tutto il resto fermo com'è in M), quali
// danno all'uscita `nome` un valore compatibile con l'osservazione? La fonte è quella di `nome` (anello aperto), o,
// con { chiuso: 'climaEAria' }, il risolutore del ciclo (anello chiuso: con tutte le retroazioni).
// → { ingresso, uscita, osservato, intervallo: [min, max] | null, pezzi: [[a, b]…], tutto: l'intervallo provato, contiene(v) }
// (`punti` e `fino`: quanti valori si provano e quante volte si dimezza per trovare un bordo: meno, se la fonte costa)
export function impone(nome, osservato, x, M, { chiuso = null, lo, hi, punti = 120, fino = 24, liberi = null } = {}) {
  const g = PER_NOME.get(nome), gx = PER_NOME.get(x), fonte = chiuso || g.fonte, I = gx.intervallo || [lo, hi]; lo = lo ?? I[0]; hi = hi ?? I[1];
  // (`liberi`: altri ingressi di cui non si sa il valore, ciascuno col suo intervallo [min, max]: si provano tredici valori
  // da un estremo all'altro e si prende tutto ciò che sta tra il minimo e il massimo dei pezzi trovati)
  if (liberi && Object.keys(liberi).length) { const [k, ...resto] = Object.keys(liberi), altri = Object.fromEntries(resto.map((r) => [r, liberi[r]])), pezzi = [], [a, b] = liberi[k], n = 13;
    for (let i = 0; i < n; i++) { const e = a > 0 && b > 0 ? a * Math.pow(b / a, i / (n - 1)) : a + ((b - a) * i) / (n - 1); pezzi.push(...impone(nome, osservato, x, conValore(M, k, e), { chiuso, lo, hi, punti, fino, liberi: altri }).pezzi); }
    return esito(nome, x, osservato, pezzi.length ? [[Math.min(...pezzi.map((q) => q[0])), Math.max(...pezzi.map((q) => q[1]))]] : [], [lo, hi]); }
  const modo = passoDi(gx, lo, hi), punto = (t) => (modo === 'rel' ? lo * Math.pow(hi / lo, t) : lo + (hi - lo) * t), mezzo = (a, b) => (modo === 'rel' ? Math.sqrt(a * b) : 0.5 * (a + b));
  const prova = (xx) => { const o = uscite(fonte, conValore(M, x, xx)); return dentro(o[nome], osservato); };
  const xs = [], ok = []; for (let k = 0; k <= punti; k++) { xs.push(punto(k / punti)); ok.push(prova(xs[k])); }
  // il bordo tra un punto dentro e uno fuori, cercato dimezzando (dalla parte larga: l'intervallo deve CONTENERE)
  const bordo = (xin, xout) => { for (let k = 0; k < fino; k++) { const m = mezzo(xin, xout); if (prova(m)) xin = m; else xout = m; } return xout; };
  const pezzi = []; let a = null;
  for (let k = 0; k <= punti; k++) {
    if (ok[k] && a === null) a = k === 0 ? xs[0] : bordo(xs[k], xs[k - 1]);
    if (a !== null && (!ok[k] || k === punti)) { pezzi.push([a, ok[k] ? xs[k] : bordo(xs[k - 1], xs[k])]); a = null; }
  }
  return esito(nome, x, osservato, pezzi, [lo, hi]);
}
function esito(nome, x, osservato, pezzi, tutto) {
  const p = pezzi.map(([a, b]) => [Math.min(a, b), Math.max(a, b)]).sort((u, w) => u[0] - w[0]), uniti = [];
  for (const q of p) { const u = uniti[uniti.length - 1]; if (u && q[0] <= u[1]) u[1] = Math.max(u[1], q[1]); else uniti.push([...q]); }
  const intervallo = uniti.length ? [uniti[0][0], uniti[uniti.length - 1][1]] : null;
  return { ingresso: x, uscita: nome, osservato, intervallo, pezzi: uniti, tutto, contiene: (y) => uniti.some(([a, b]) => y >= a * (1 - 1e-9) - 1e-300 && y <= b * (1 + 1e-9) + 1e-300) };
}
// CHE COSA CHIEDE UN CONTENUTO, nelle grandezze del grafo: si appoggia a `chiede` di bolle.js (regola 5), che per i
// contenuti che dipendono dalle condizioni del punto dà gli intervalli di temperatura e pressione; qui diventano
// osservazioni su grandezze del grafo, da cui `impone` risale. (Una fonte: le soglie stanno in leggi.js, lette da bolle.js.)
export const DA_BOLLA = { T: 'clima.temperatura', pressione: 'aria.pressione' };
export function chiedeDalBasso(contenuto, M) {
  const r = mBolle.chiede({ contenuto }).find((q) => q.livello === 'punto'); if (!r) return null;
  const I = r.intervalli({ T: valore('clima.temperatura', M), pressione: valore('aria.pressione', M) }), o = {};
  for (const k in I) if (DA_BOLLA[k]) o[DA_BOLLA[k]] = I[k];
  return { contenuto, perche: r.perche, legge: r.legge, osservazioni: o };
}
