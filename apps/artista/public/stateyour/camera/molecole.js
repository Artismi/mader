// molecole.js — LA CHIMICA GENERALE: qualsiasi molecola dai suoi atomi e dai suoi legami, senza elenchi di molecole.
//
// chimica.js conosce 41 specie con entalpia ed entropia tabulate: ciò che non è nell'elenco, in quel mondo non può
// esistere. Qui le regole sono CHIUSE (INTRECCIO.md, regola 2): dicono che cosa può esistere e accadere per ogni grafo
// di atomi che le leggi ammettono. Nessuno costruirà a mano una macchina molecolare; ma una storia di chimica deve
// poterla costruire. Il modulo è diviso in parti (ognuna con la sua intestazione):
//   molecole_atomi.js     gli elementi 1-36 e il molibdeno: gusci, carica efficace, valenze, raggi, elettronegatività
//   molecole_grafo.js     le molecole come grafi; lettura (SMILES semplificato), validità, chiave canonica, R e S
//   molecole_forma.js     la forma in tre dimensioni (VSEPR, lunghezze, angoli, torsioni, anelli)
//   molecole_energia.js   entalpia, entropia, energia libera a T e P; in acqua: idratazione, pKa, stati di protonazione
//   molecole_reazioni.js  le reazioni come regole generali sui siti; barriere e velocità; catalisi; fotolisi
//   molecole_forze.js     il campo di forze; chi si scioglie e chi si aggrega; polimeri; grana grossa; scena 3D
//   molecole_rete.js      la rete delle reazioni di un luogo; equilibrio; cicli autocatalitici; RAF; anfifiliche
//   molecole_incontri.js  l'energia d'interazione di due molecole qualsiasi, e ciò che ne discende: catalisi da parte di
//                         qualunque molecola, copia su stampo, ripiegamento di una catena, superfici dei minerali
//
// CIÒ CHE LE REGOLE ORA PERMETTONO (seconda tappa; i riscontri sono nelle prove 24-35):
//   · reazioni: addizioni coniugate, enoli ed enammine al carbonio, sostituzioni su carbonio saturo (lente), epossidi,
//     sostituzione aromatica, Diels-Alder e trasposizioni [3,3], spostamenti 1,2, disolfuri, scambio di due idrogeni,
//     trasferimento di elettroni con gli ioni metallici (potenziali dai dati: Fe³⁺/Fe²⁺ 0,775 V), fotoionizzazione e
//     reazioni dagli stati eccitati, isomeria cis-trans;
//   · la mano: cis/trans nella chiave e nella forma; i centri nuovi nascono in tutte le forme, alla pari (stereo: true);
//     i diastereomeri hanno energie diverse (campo di forze); la cinetica (evolvi) amplifica uno sbilancio;
//   · la rete: reagisce chi è sopra una soglia di concentrazione (peptide + peptide); stazionarie converge; scatole con
//     una barriera (regola di Overton); forza ionica (Davies) e pKa con la temperatura (van 't Hoff);
//   · catalisi da parte di qualsiasi molecola (metà della differenza di legame tra prodotti e reagenti + vicinanza);
//   · copia su stampo come conseguenza dell'energia d'interazione; ricerca conformazionale (ricottura sui diedri);
//   · ioni metallici con le energie misurate; gruppi ferro-zolfo; siti di superficie dal reticolo vero (materia.js);
//     fosfati, anidridi, ATP tarati su tre idrolisi misurate; cheCosaChiede come funzione della regola 5.
// CHE COSA RESTA VIETATO O SBAGLIATO (stampato dalle prove):
//   · la copia fedele: senza la geometria dell'elica le purine dello stampo prendono un'altra purina, e in acqua le basi
//     libere si impilano senza scegliersi; l'energia d'interazione senza solvente è 1,2-1,9 volte troppo forte;
//   · la catalisi covalente esce (un'ammina nell'aldolica: 10⁵ per mol/L) ma l'imidazolo sugli esteri attivati è 10⁵ volte
//     troppo lento: una barriera per famiglia non vede il gruppo uscente; lo stato di transizione non ha una geometria sua;
//   · il ripiegamento: la ricerca dice se c'è un minimo netto per catene fino a 20-30 residui; una proteina di 300 no
//     (servirebbero acqua esplicita o un solvente implicito tarato, le catene laterali che ruotano, 10⁶-10⁹ passi, o un
//     campo a grana grossa DERIVATO dagli atomi: quello di qui non li segue, correlazione −0,3);
//   · chinoni (deidrogenazioni coniugate), le enammine terziarie (la prolina) come specie neutre, cluster metallici oltre
//     la regola di log K, le specie adsorbite dentro la rete (ci sono come complessi, non come passi di superficie);
//   · le famiglie rare e le mani distinte si aprono a richiesta (famiglie: 'tutte', stereo: true): di suo la rete non le usa.
//
// LEGGI (ricavate o applicate in generale):
//   · struttura elettronica: riempimento dei gusci (Madelung), regole di Slater → raggio, ionizzazione, elettronegatività
//     di Allred e Rochow; ottetto e duetto, valenze espanse dal terzo periodo, cariche formali;
//   · grafi: validità di qualunque grafo; aromaticità di Hückel; chiave canonica; priorità di Cahn, Ingold e Prelog;
//   · forma: domini elettronici (VSEPR), raggi covalenti, coniugazione delle coppie solitarie;
//   · energia: additività dei legami con le interazioni tra vicini (Allen 1959) e la tensione d'anello; Pauling per i
//     legami senza dati; Sackur-Tetrode, rotatore rigido, oscillatori armonici, rotori frenati; Born per gli ioni;
//     effetto induttivo sui pKa; somma sugli stati di protonazione (energia trasformata a un pH);
//   · reazioni: nove famiglie di passi elementari sui siti; Marcus per le barriere, Eyring per le velocità; Brønsted per
//     la catalisi acido-base; un fotone che supera la soglia di assorbimento e l'energia del legame lo spezza;
//   · forze: molle, Lennard-Jones, Coulomb con cariche da differenze di elettronegatività, solvente implicito;
//   · rete: minimo dell'energia di Gibbs con gli atomi conservati; autocatalisi stechiometrica; RAF.
// DATI (misurati; la fonte è accanto a ogni tabella, nel file dove sta):
//   · atomi: PubChem (IUPAC, NIST), Cordero 2008, Pyykkö 2009, CODATA; parametri di UFF e QEq (Rappé e altri 1991-92);
//   · ΔHf di 89 molecole di riferimento (18 da ATcT 1.202, Argonne; 71 dalla letteratura primaria raccolta da Pedley 1986-94
//     e CODATA 1989, trovate attraverso l'indice del NIST WebBook e non ancora rilette lì) → 75 termini di legame; ΔG di idratazione di 70 molecole
//     (FreeSolv, costanti di Henry) → i contributi dei siti; pKa di base per classe di sito (CRC; Perrin 1981) e σ
//     induttive (Charton 1981); numeri d'onda caratteristici dei piegamenti; raggi ionici (Shannon 1976);
//   · barriere intrinseche di Marcus per famiglia, ciascuna da una velocità misurata (INTRINSECHE in molecole_reazioni.js);
//   · soglie di assorbimento ultravioletto per tipo di elettroni; CMC del dodecanoato; volumi e lunghezze di Tanford.
// PARAMETRI LIBERI (scelti da noi: da eliminare):
//   · κ = 2,6 delle cariche parziali (tarato sull'acqua TIP3P); costante dielettrica 8r in acqua; +0,5 kJ/mol per un
//     atomo polare coperto; 30× delle superfici; 10^(1,5·carica) degli ioni metallici; i tre numeri di logKComplesso;
//   · le larghezze della regressione (3 kJ/mol sui dati, 60-120 sulla riserva); l'area delle teste 20 + 6·n + 28·q² Å².
// SEMPLIFICAZIONI:
//   · gli idrogeni stanno sul loro atomo; cis e trans dei doppi legami non sono distinti (lo sono R e S); niente isotopi;
//   · ΔHf di ioni in fase gas per classi rozze; in acqua gli ioni passano dal pKa (bene) o da Born (male: vedi sotto);
//   · gli stati di protonazione sono in equilibrio dentro ogni specie; i complessi dei metalli con una regola di logK;
//   · le barriere dipendono solo dalla famiglia e da ΔG, non dall'ingombro né dall'orbitale; le reazioni concertate a
//     più centri (pericicliche), i riarrangiamenti di scheletro, il trasferimento di un elettrone tra ioni metallici e
//     molecole non ci sono; l'ossidoriduzione passa solo per H2 e per lo scambio di due idrogeni;
//   · il solvente è implicito: niente molecole d'acqua esplicite attorno al soluto (quelle le disegna mare.js);
//   · la rete fa reagire ogni specie solo con le molecole piccole e taglia per taglia, ΔG e velocità (dichiarati).
// CHE COSA NON TORNA (le prove stampano i numeri):
//   · Slater: ionizzazione entro il 44% in media, raggi il 30%; Allred-Rochow sbaglia F, O e H con i raggi di Cordero;
//   · ΔHf: 2-3 kJ/mol sui riferimenti, 7 in media su molecole piccole mai viste (11 su tutte), ma 25-60 su aromatici
//     condensati ed eterocicli con più azoti (naftalene, uracile, adenina) e sui dinitrili; togliendo una molecola dai
//     riferimenti i legami che solo lei ha (CO, NO, SO2) ricadono sulla regola di Pauling e sbagliano di 90-270 kJ/mol;
//     i minerali (reticoli ionici) non sono molecole: errori del 10-40%;
//   · gli ioni dei metalli a due cariche in acqua (Born): 30-190 kJ/mol di errore (Mg²⁺, Fe²⁺): le loro reazioni di
//     ossidoriduzione e di precipitazione vanno prese da mare.js (energia(…, { misure }));
//   · i pKa degli eterocicli (adenina: 1,2 contro 4,2) e dei terzi stadi; il dimero d'acqua è troppo legato (−28 contro −21);
//   · le barriere: una per famiglia; un errore di 10 kJ/mol è un fattore 50 sulla velocità a 25 °C;
//   · le eliche e i foglietti di un peptide sono minimi locali con i loro legami a idrogeno, ma il campo non sa dire
//     quale sequenza si ripiega in quale forma (manca l'acqua esplicita, l'entropia della catena, la cooperatività).
// Unità: kJ/mol, J/(mol·K), K, Pa, mol/L, Å (le coordinate; nm nella scena 3D).

//
// AGGIUNTE DELL'11-2026 (terzo giro: i divieti che restavano tra la chimica e la vita «in potenza»)
//   · LA RETE NON HA PIÙ UN TETTO ALLA TAGLIA: rete() senza «atomiMassimi» usa il CRITERIO DEL FLUSSO di RMG (Gao e altri
//     2016) in forma integrata nel tempo: entra ciò che nel tempo dato raccoglierebbe almeno ε della materia che si è
//     mossa (molecole_rete.js › passoFlusso). PARAMETRI: ε = 10⁻³, cMinima = 10⁻¹² mol/L, «abbondante» = sopra un
//     millesimo della specie più abbondante, fascio = 40 per generazione. Con «atomiMassimi» resta la rete di prima.
//   · I POZZI (molecole_pozzi.js): vite MISURATE per classe di legame (ammide, glicoside, fosfodiestere con e senza
//     ossidrile vicino, deamminazione delle basi, zuccheri), in forma di Arrhenius, con le fonti; pozzi(x, { T, pH, luce })
//     le somma ai passi in discesa delle regole generali e alla fotolisi. La rete le usa (opzione «pozzi», di suo accesa).
//     Il ΔG di condensazione del peptide esce dalle regole (+8 contro +9,2 kJ/mol); glicoside e fosfodiestere dal dato.
//   · TRE TERMINI TARATI nell'energia (molecole_energia.js): il metafosfato ('gP:DD'), l'imminolo ('gc:im'), l'ammidina
//     non aromatica ('gc:am'): senza, ogni fosfato, ogni ammide e ogni nitrile della rete scivolava in una forma che in
//     natura è sfavorita. Valori [ricordati, incerti], un parametro per classe.
//   · evolvi(): tolto il limite «metà per passo» (teneva troppo pieni i pozzi del primo ordine con passi lunghi) e
//     ordinate le reazioni dentro il passo (sorgenti pure prima, pozzi ultimi): lo stato stazionario è sorgente × vita.
//   · blowersMasel(E0, w0, ΔH): provata sull'imidazolo + p-nitrofenil acetato: NON sistema l'errore di 10⁵ (dà la barriera di
//     Marcus entro 0,1 kJ/mol): manca la dipendenza della barriera intrinseca dal nucleofilo e dal gruppo uscente.
//   · CRISTALLI (molecole_cristalli.js): conglomerato() amplifica uno sbilancio tra le mani (Viedma/Uwaha) e fa la
//     cristallizzazione preferenziale; cristallo() dice se una specie precipita DATA la solubilità — la solubilità
//     stimata dal reticolo (una coppia × Z/2) sbaglia di molti ordini di grandezza: è dichiarato, con il progetto.
//   · FONTI: 18 ΔHf di riferimento ora da ATcT 1.202; le altre 71 dalla letteratura primaria via indice del WebBook (non rilette).
// CHE COSA NON TORNA DI NUOVO (stampato dalle prove): l'adenina da 5 HCN non entra per flusso (solo con «verso»);
// l'adenosina N9 resta sul bordo (10⁻¹⁰ mol/L); l'adenosina vive 9 anni a 25 °C (misurato: migliaia); la soglia di
// fotolisi della glicina è 320 nm (misurato ~230); la rete con il flusso costa 10-25 s per 100 specie di nucleo.
import { atomo as atomo_, NUMERI_ATOMICI } from './molecole_atomi.js';
import { molecola as molecola_, chiave as chiave_, valida as valida_, stereoisomeri, formula, massa, carica, conta, componenti, chiralita, speculare, isomeri, anelli } from './molecole_grafo.js';
import { forma as forma_, distanza, angolo, diedro, ruota, inerzia, numeroDiSimmetria, lunghezzaLegame, dominio } from './molecole_forma.js';
import { energia as energia_, entalpiaCon, entalpiaGas, entropiaGas, termica, termochimica, RIFERIMENTI, IDRATAZIONE, idratazione, inOlio, pKaSito, pKaApparenti, sitiAcidoBase, speciazione, alPH, neutra, logKComplesso, risolvi, IONI_MISURATI, statoRedox, debyeHuckel, pKaAllaT, R } from './molecole_energia.js';
import { reazioni as reazioni_, velocita as velocita_, siti, catalisi, fotolisi, fotoreazioni, fotoni, conservata, bilancio, INTRINSECHE, espandiStereo, blowersMasel } from './molecole_reazioni.js';
export { blowersMasel };
import { tensione, energiaStereo, campo, forze as forze_, minimizza, passo, insieme, cariche, aggregazione, polimero as polimero_, passoDiCondensazione, diedriPeptide, granaGrossa, energiaGrossa, scena3D as scena3D_ } from './molecole_forze.js';
import { interazione, catalisiDa, copia, ripiega, superficie, adsorbi, CONCENTRAZIONE_EFFICACE } from './molecole_incontri.js';
import { evolvi, scatole, rete as rete_, equilibrioRete, stazionarie, autocatalitici as autocatalitici_, raf, anfifiliche, velocitaVera } from './molecole_rete.js';
import { POZZI, CONDENSAZIONE_MISURATA, classi, kDiClasse, pozziMisurati, misurato, pozziPropri } from './molecole_pozzi.js';
export { POZZI, CONDENSAZIONE_MISURATA, classi, kDiClasse, pozziMisurati, misurato, velocitaVera };
import { cristallo, conglomerato } from './molecole_cristalli.js';
import { ANNO, ZERO_CELSIUS } from './leggi.js'; // le costanti e le unità: un posto solo
export { cristallo, conglomerato };

// ---------- l'interfaccia (i nomi chiesti; il resto è esportato più sotto)
export const atomo = atomo_, molecola = molecola_, chiave = chiave_, valida = valida_, forma = forma_;
// energia(…, { stereo: true }): in più, di quanto questa forma stereo sta sopra la più stabile delle sue (dal campo di forze)
export const energia = (x, c = {}) => { const e = energia_(x, c); if (!c.stereo) return e; const d = energiaStereo(x, { solvente: c.solvente }); return d ? { ...e, G: e.G + d, H: e.H + d, stereo: d } : e; };
// reazioni(…, { stereo: true }): i prodotti con centri chirali o doppi legami nuovi escono in tutte le loro forme, alla pari
export const reazioni = (a, b = null, opz = {}) => (opz.stereo ? espandiStereo(reazioni_(a, b, opz)) : reazioni_(a, b, opz));
export const velocita = (r, c = {}) => velocita_(r, c.stereo ? { ...c, energiaDi: energia } : c);
export const polimero = polimero_, rete = rete_, autocatalitici = autocatalitici_, scena3D = scena3D_;
// forze(configurazione): una molecola, una forma, un insieme([...]) o un campo già preparato → energia e forze
export const forze = (x, opzioni = {}) => forze_(x && x.escl ? x : campo(x, opzioni));
export { NUMERI_ATOMICI, interazione, catalisiDa, copia, ripiega, superficie, adsorbi, CONCENTRAZIONE_EFFICACE, scatole, stereoisomeri, espandiStereo, tensione, energiaStereo, evolvi, formula, massa, carica, conta, componenti, chiralita, speculare, isomeri, anelli, distanza, angolo, diedro, ruota, inerzia, numeroDiSimmetria, lunghezzaLegame, dominio,
  entalpiaCon, entalpiaGas, entropiaGas, termica, termochimica, RIFERIMENTI, IDRATAZIONE, idratazione, inOlio, pKaSito, pKaApparenti, sitiAcidoBase, speciazione, alPH, neutra, logKComplesso,
  siti, catalisi, fotolisi, fotoreazioni, fotoni, conservata, IONI_MISURATI, statoRedox, debyeHuckel, pKaAllaT, bilancio, INTRINSECHE, campo, minimizza, passo, insieme, cariche, aggregazione, passoDiCondensazione, diedriPeptide, granaGrossa, energiaGrossa,
  equilibrioRete, stazionarie, raf, anfifiliche };

// ---------- IL RACCORDO con chimica.js e mare.js
// le specie di chimica.js (formule) come grafi: è un dizionario di nomi, non di chimica (una formula non dice la struttura)
// ---------- I POZZI di una molecola in acqua: tutto ciò che la distrugge, con la sua vita
// pozzi(x, { T, pH, luce }) → { k (1/s), vita (s), mezzaVita (s), voci: [{ classe, nome, k, fonte, misurato }], fuoriIntervallo,
//   stazionario(sorgente in mol/L/s) → mol/L (= sorgente × vita: ciò che resta dove la molecola nasce a quel ritmo) }
// Tre generi di voci: (1) i legami di una classe con la vita MISURATA (molecole_pozzi.js: ammide, glicoside, fosfodiesteri,
// basi, zuccheri); (2) i passi in discesa (ΔG < −15 kJ/mol) che le REGOLE GENERALI le danno da sola o con l'acqua, esclusi
// quelli già contati in (1); (3) con «luce» (lo spettro del luogo: { Tstella, diluizione, trasmissione }), la FOTOLISI.
export function pozzi(x, c = {}) {
  const cond = { T: 298.15, pH: 7, solvente: 'acqua', ...c }, m = x && x.m ? x.m : molecola_(x), mis = pozziMisurati(chiave_(m), cond), voci = [...mis.voci], zuccheroIo = classi(chiave_(m)).zucchero > 0; let k = mis.k;
  for (const r of reazioni_(m, null, { tutte: false }).concat(reazioni_(m, 'O', { tutte: false, lente: false, metalli: false }))) { let v; try { if (r.tipo === 'tautomeria' || misurato(r, cond)) continue; if (zuccheroIo && r.prodotti.length === 1 && classi(r.prodotti[0]).zucchero) continue; // (le forme di uno stesso zucchero — anelli, catena aperta — non sono la sua fine)
      v = velocitaVera(r, cond); if (v.misurato) continue; } catch { continue; } // (un tautomero è la stessa sostanza; i legami misurati sono già contati)
    if (v.dG < -15 && isFinite(v.k) && v.k > 0) { voci.push({ classe: r.tipo, nome: `${r.tipo} (regola generale) → ${r.prodotti.join(' + ')}`, legami: 1, k: v.k, fonte: 'regola generale', misurato: false }); k += v.k; } }
  if (cond.luce) { let J = 0; try { for (const f of fotolisi(m, cond.luce)) J += f.J || 0; } catch { J = 0; } if (J > 0) { voci.push({ classe: 'fotolisi', nome: 'fotolisi (regola generale: soglia del cromoforo e flusso di fotoni)', legami: 1, k: J, fonte: 'regola generale', misurato: false }); k += J; } }
  voci.sort((a, b) => b.k - a.k);
  return { k, vita: 1 / k, mezzaVita: Math.LN2 / k, voci, fuoriIntervallo: mis.fuoriIntervallo, stazionario: (sorgente) => sorgente / k };
}

export const GAS_DI_CHIMICA = { H2: '[HH]', He: '[He]', N2: 'N#N', O2: 'O=O', Cl2: 'ClCl', S2: 'S=S', H2O: 'O', CO: '[C-]#[O+]', CO2: 'O=C=O', CH4: 'C', NH3: 'N', HCN: 'C#N', H2CO: 'C=O', CH3OH: 'CO', H2S: 'S', SO2: 'O=S=O', NO: '[N]=O', C2H2: 'C#C', C2H6: 'CC', HCl: 'Cl' };
// l'equilibrio di una miscela di gas con le energie di QUI (stesso problema di equilibrio() di chimica.js: minimo
// dell'energia di Gibbs a T e P con gli atomi conservati; g = ΔHf − T·S a 298 K, come là; senza la fuliggine).
// → { chiave o nome: frazione molare }
export function equilibrioGas({ T, P = 1e5, elementi = {}, specie = Object.values(GAS_DI_CHIMICA) } = {}) {
  const el = Object.keys(elementi).filter((e) => elementi[e] > 0), tot = el.reduce((s, e) => s + elementi[e], 0), b = el.map((e) => elementi[e] / tot);
  const sp = specie.filter((s) => Object.keys(conta(s)).every((e) => el.includes(e))), A = sp.map((s) => { const c = conta(s); return el.map((e) => c[e] || 0); }), m = el.length;
  const c = sp.map((s) => { const e = energia_(s, {}); return (e.Hf298 - (T * e.S298) / 1000) / (R * T) + Math.log(P / 1e5); });
  let lam = new Array(m).fill(Math.min(0, ...c.map((ci, i) => ci / A[i].reduce((x, y) => x + y, 0))));
  const n = new Float64Array(sp.length), psi = (l, s) => { let v = 0; for (let i = 0; i < sp.length; i++) { let x = s - c[i]; for (let j = 0; j < m; j++) x += A[i][j] * l[j]; v += n[i] = Math.exp(Math.min(x, 300)); } for (let j = 0; j < m; j++) v -= b[j] * l[j]; return v; };
  const minimizzaPsi = (s) => { for (let it = 0; it < 500; it++) { const v0 = psi(lam, s), G = Array.from({ length: m }, () => new Array(m + 1).fill(0)); for (let i = 0; i < sp.length; i++) for (let p = 0; p < m; p++) { if (!A[i][p]) continue; G[p][m] -= A[i][p] * n[i]; for (let q = 0; q < m; q++) G[p][q] += A[i][p] * A[i][q] * n[i]; }
      let scarto = 0, diag = 0; for (let p = 0; p < m; p++) { G[p][m] += b[p]; scarto = Math.max(scarto, Math.abs(G[p][m]) / b[p]); diag = Math.max(diag, G[p][p]); } if (scarto < 1e-11) break; for (let p = 0; p < m; p++) G[p][p] += 1e-13 * diag + 1e-300;
      const res = G.map((r) => r[m]), d = risolvi(G); let t = 1, mx = 0, pend = 0; for (let i = 0; i < sp.length; i++) { let de = 0; for (let j = 0; j < m; j++) de += A[i][j] * d[j]; mx = Math.max(mx, de); } if (mx > 1.5) t = 1.5 / mx; for (let p = 0; p < m; p++) pend -= res[p] * d[p];
      for (let k = 0; k < 40; k++, t /= 2) { const l2 = lam.map((x, j) => x + t * d[j]); if (psi(l2, s) <= v0 + 1e-4 * t * pend || k === 39) { lam = l2; break; } } }
    psi(lam, s); let N = 0; for (let i = 0; i < sp.length; i++) N += n[i]; return N; };
  let s = Math.log(0.5), s0 = 0, F0 = 0, N = 0;
  for (let k = 0; k < 60; k++) { N = minimizzaPsi(s); const F = Math.log(N) - s; if (Math.abs(F) < 1e-12) break; const passoS = k === 0 || F === F0 ? F : Math.max(-8, Math.min(8, (-F * (s - s0)) / (F - F0))); s0 = s; F0 = F; s += passoS; }
  return Object.fromEntries(sp.map((x, i) => [x, n[i] / N]));
}
// reteDelLuogo: dalle condizioni di un luogo, come le danno chimica.js e mare.js, alla rete delle sue reazioni.
//   luogo = { T, P (Pa), pH, gas: { formula di chimica.js: frazione }, pressione (Pa dell'aria), ioni: { 'Mg2+': mol/kg, … } (mare.js),
//             minerali: [nomi o { nome, frazione }] (chimica.js minerali(), i «fumi» dei camini di mare.js),
//             prebiotica: { HCN, formaldeide } (i tassi relativi di chimica.js prebiotica()), molecole: { SMILES: mol/L } (in più),
//             luce: { Tstella, diluizione } (per la fotolisi), attivitaAcqua (1 nel mare, meno in una pozza che si asciuga) }
// I gas entrano sciolti secondo la loro energia di idratazione (legge di Henry: c = p·exp(−ΔG/RT)). I tassi di
// «prebiotica» non sono concentrazioni: si moltiplicano per scalaPrebiotica (mol/L per unità) [PARAMETRO LIBERO, 10⁻³].
export function reteDelLuogo(luogo = {}, opzioni = {}) {
  const T = luogo.T ?? 298.15, partenza = { ...(luogo.molecole || {}) }, scala = opzioni.scalaPrebiotica ?? 1e-3, pTot = (luogo.pressione ?? luogo.P ?? 1e5) / 1e5;
  for (const f in luogo.gas || {}) { const s = GAS_DI_CHIMICA[f]; if (!s || f === 'H2O' || f === 'He') continue; const p = luogo.gas[f] * pTot, cc = p * Math.exp(-(idratazione(s) + R * 298.15 * Math.log(24.465)) / (R * T)); if (cc > 1e-12) partenza[s] = (partenza[s] || 0) + cc; }
  if (luogo.prebiotica) { if (luogo.prebiotica.HCN > 0) partenza['C#N'] = (partenza['C#N'] || 0) + scala * luogo.prebiotica.HCN; if (luogo.prebiotica.formaldeide > 0) partenza['C=O'] = (partenza['C=O'] || 0) + scala * luogo.prebiotica.formaldeide; }
  const ioni = {}; for (const k in luogo.ioni || {}) { const mm = /^([A-Z][a-z]?)(\d*)\+$/.exec(k) || /^([A-Z][a-z]?)\+(\d*)$/.exec(k); if (mm && atomo_(mm[1]).metallo) ioni[`${mm[1]}+${mm[2] || 1}`] = luogo.ioni[k]; }
  const cond = { T, P: luogo.P ?? 1e5, pH: luogo.pH ?? 7, solvente: 'acqua', attivitaAcqua: luogo.attivitaAcqua ?? 1, ioni, minerali: (luogo.minerali || []).map((x) => (typeof x === 'string' ? x : x.nome)), luce: luogo.luce || null, misure: luogo.misure };
  const r = rete_(partenza, cond, opzioni);
  // la luce: i pezzi in cui i fotoni spezzano le molecole di partenza (velocità per molecola, 1/s)
  r.fotolisi = luogo.luce ? Object.keys(partenza).flatMap((k) => fotolisi(k, luogo.luce).filter((x) => x.J > 1e-12).slice(0, 2)) : [];
  return r;
}
// ---------- CHE COSA CHIEDE (INTRECCIO, regola 5: dal piccolo al grande)
// Per una molecola, o un polimero, che cosa deve offrire il luogo perché possa esserci e durare: gli elementi, l'acqua, la
// finestra di temperatura e di pH in cui non si disfa prima di «tempo», quanto deve essere asciutto (per i legami fatti
// per condensazione), un riducente o un'altra energia, i minerali che servono a farla, e quanta storia c'è in mezzo.
//   cheCosaChiede(molecola | polimero, { tempo (s: quanto deve durare; di suo cent'anni), T, pH (per l'energia di formazione) }) →
//   { che, elementi: { C: n, … }, acqua: 'liquida', T: [min, max] (K), pH: [min, max], mezzaVita: { '298': s, '373': s },
//     attivitaAcqua: (solo per i polimeri) sopra questo valore i suoi legami si rifanno acqua; attivatore: se serve anche a secco,
//     energia: { formazione (kJ/mol da CO2, NH3, H2S, fosfato, acqua e H2), riducente: n di H2 per molecola, tipo },
//     minerali: [che cosa serve e perché], generazioni (stima), confronta(luogo) → { possibile, mancano: [testo] }, nota }
// La mezza vita viene dai passi che la molecola può fare da sola o con l'acqua, con le loro velocità (molecole_reazioni.js).
// GENERAZIONI: stima dichiarata di quanti passi di rete servono dai gas e dai sali semplici: ¾ × (legami tra atomi pesanti
// + H2 da aggiungere), più log2 delle unità per un polimero. Il ¾ è tarato su tre vie trovate dalla rete (acido acetico in
// 5, glicina in 6 + 3, adenina in 9 + 3); non conta la selezione che serve a fare UNA sequenza tra tante.
// «luogo» per confronta: { T, pH, attivitaAcqua, acqua: 'liquida'…, gas: { H2: frazione, CO2, … }, ioni: { 'Mg2+': …, fosfato }, minerali: [nomi],
//   energia: { luce, scariche, gradiente } (vero/falso o un numero), cicliAsciutti (vero/falso), anni } — ciò che mare.js, chimica.js e il clima sanno dare.
export function cheCosaChiede(x, { tempo = 3.156e9, T = 298.15, pH = 7 } = {}) {
  const poli = x && x.m && x.unita ? x : null, m = poli ? poli.m : molecola_(x), c = conta(m), cond = { T, pH, solvente: 'acqua' };
  // gli ingredienti: C dalla CO2, N dall'ammoniaca, S da H2S, P dal fosfato, O dall'acqua, H da H2
  const n = { 'O=C=O': c.C || 0, N: c.N || 0, S: c.S || 0, 'OP(=O)(O)O': c.P || 0 }; n.O = (c.O || 0) - 2 * n['O=C=O'] - 4 * n['OP(=O)(O)O']; n['[HH]'] = ((c.H || 0) - 3 * n.N - 2 * n.S - 3 * n['OP(=O)(O)O'] - 2 * n.O) / 2;
  const metalli = Object.keys(c).filter((e) => atomo_(e).metallo), altri = Object.keys(c).filter((e) => !['C', 'H', 'N', 'O', 'S', 'P'].includes(e) && !metalli.includes(e));
  const piccola = m.atomi.length <= 400, prova_ = poli ? molecola_(passoDiCondensazione(poli.unita[0].nome, poli.unita[Math.min(1, poli.unita.length - 1)].nome, poli.tipo, {}).dimero) : m;
  let formazione = NaN; if (piccola && !metalli.length && !altri.length) { formazione = energia_(m, cond).G; for (const k in n) formazione -= n[k] * energia_(k, cond).G; }
  // quanto dura: la somma delle velocità dei passi in discesa che può fare da sola o con l'acqua
  const perdita = (cc) => pozzi(prova_, cc).k; // (vite misurate per classe di legame, più i passi in discesa delle regole generali) // (solo i passi davvero in discesa: gli equilibri tra forme della stessa molecola non la distruggono)
  const vita = (cc) => Math.LN2 / Math.max(perdita({ solvente: 'acqua', ...cc }), 1e-300), finestra = (lista, fa) => { const buoni = lista.filter((v) => vita(fa(v)) >= tempo); return buoni.length ? [Math.min(...buoni), Math.max(...buoni)] : null; };
  const limiteMolecola = prova_.atomi.length <= 40, Ts = [ZERO_CELSIUS, 298.15, 323.15, 348.15, 373.15, 423.15, 473.15], pHs = [1, 3, 5, 7, 9, 11, 13];
  const finT = limiteMolecola ? finestra(Ts, (t) => ({ T: t, pH })) : null, finPH = limiteMolecola ? finestra(pHs, (p) => ({ T, pH: p })) : null, mezzaVita = limiteMolecola ? { 298: vita({ T: 298.15, pH }), 373: vita({ T: 373.15, pH }) } : null;
  // i polimeri: quanto asciutto perché il legame si faccia (ΔG = 0 a quell'attività dell'acqua)
  let attivitaAcqua = null, attivatore = false; if (poli && poli.unita.length > 1) { const d = passoDiCondensazione(poli.unita[0].nome, poli.unita[1].nome, poli.tipo, { ...cond }).dG; attivitaAcqua = Math.min(1, Math.exp(-d / (R * T))); attivatore = attivitaAcqua < 1e-3; }
  const stima = (mm, h2) => Math.max(1, Math.round(0.75 * (mm.legami.filter((l) => l.t === 'c').length + Math.max(0, h2)))), generazioni = poli ? Math.max(...[...new Set(poli.unita.map((u) => u.nome))].map((u) => cheCosaChiede(u, { tempo, T, pH }).generazioni)) + Math.ceil(Math.log2(poli.unita.length)) : stima(m, n['[HH]']);
  const minerali = []; if (n['[HH]'] > 0 && (c.C || 0) > 0) minerali.push('un metallo a guscio d incompleto (solfuri o ossidi di ferro e nichel) per usare H2 e CO2, oppure luce o scariche su un\'aria riducente'); if (c.P) minerali.push('fosfato sciolto (apatite che si scioglie, laghi di carbonato)'); for (const e of metalli) minerali.push(`${atomo_(e).nome} sciolto`); if (poli) minerali.push('una superficie che concentri i monomeri (argille) aiuta ma non è necessaria');
  const out = { che: poli ? `${poli.tipo} di ${poli.unita.length} unità` : chiave_(m), elementi: c, acqua: 'liquida', T: finT, pH: finPH, mezzaVita, attivitaAcqua, attivatore,
    energia: { formazione, riducente: Math.max(0, n['[HH]']), ossidante: Math.max(0, -n['[HH]']), tipo: n['[HH]'] > 0 ? (formazione < 0 ? 'un riducente (H2 o equivalenti): poi è in discesa' : 'un riducente e in più energia (luce, scariche, un gradiente)') : formazione < 0 ? 'nessuna: in discesa' : 'energia (luce, scariche, un gradiente)' }, minerali, generazioni, ingredienti: Object.fromEntries(Object.entries(n).filter(([, v]) => Math.abs(v) > 1e-9)) };
  out.nota = `${out.che}: ${formula(m)}; ${out.energia.tipo}${isFinite(formazione) ? ` (${formazione.toFixed(0)} kJ/mol dagli ingredienti semplici)` : ''}; ${finT ? `dura più di ${(tempo / ANNO).toFixed(0)} anni tra ${(finT[0] - ZERO_CELSIUS).toFixed(0)} e ${(finT[1] - ZERO_CELSIUS).toFixed(0)} °C` : limiteMolecola ? 'in acqua non dura quel tempo a nessuna temperatura provata' : 'durata non calcolata (troppo grande)'}${finPH ? `, tra pH ${finPH[0]} e ${finPH[1]}` : ''}${attivitaAcqua != null ? `; i suoi legami si fanno sotto un'attività dell'acqua di ${attivitaAcqua.toPrecision(2)}${attivatore ? ' (serve un attivatore)' : ''}` : ''}; circa ${generazioni} generazioni di rete dai gas e dai sali`;
  // il confronto con un luogo: che cosa ha e che cosa gli manca
  out.confronta = (luogo = {}) => { const mancano = [], gas = luogo.gas || {}, ioni = luogo.ioni || {}, min = (luogo.minerali || []).map((q) => (typeof q === 'string' ? q : q.nome)).join(' '), en = luogo.energia || {}, ha = (...ff) => ff.some((f) => (gas[f] || 0) > 1e-9);
    if (luogo.acqua && luogo.acqua !== 'liquida') mancano.push('acqua liquida'); if (finT && luogo.T != null && (luogo.T < finT[0] || luogo.T > finT[1])) mancano.push(`una temperatura tra ${finT[0].toFixed(0)} e ${finT[1].toFixed(0)} K (qui ${luogo.T.toFixed(0)})`); if (limiteMolecola && !finT) mancano.push('non dura abbastanza in acqua a nessuna temperatura');
    if (finPH && luogo.pH != null && (luogo.pH < finPH[0] - 1 || luogo.pH > finPH[1] + 1)) mancano.push(`un pH tra ${finPH[0]} e ${finPH[1]} (qui ${luogo.pH})`);
    if (c.C && !ha('CO2', 'CO', 'CH4', 'HCN', 'H2CO', 'CH3OH', 'C2H2', 'C2H6')) mancano.push('carbonio (CO2, CO, metano…)'); if (c.N && !ha('N2', 'NH3', 'HCN', 'NO')) mancano.push('azoto'); if (c.S && !ha('H2S', 'SO2', 'S2') && !/solfuro|pirite|gesso/i.test(min)) mancano.push('zolfo'); if (c.P && !(ioni.fosfato > 0 || ioni.P > 0 || /apatite|fosfat/i.test(min))) mancano.push('fosforo (fosfato sciolto o apatite)');
    for (const e of metalli) if (!Object.keys(ioni).some((q) => q.startsWith(e))) mancano.push(`${atomo_(e).nome} sciolto`);
    const riducente = ha('H2', 'CH4', 'NH3', 'H2S', 'HCN') || luogo.riducente, energia2 = en.luce || en.scariche || en.gradiente || luogo.luce;
    if (out.energia.riducente > 0 && !riducente) mancano.push('un riducente (idrogeno dai camini, o un\'aria con metano e ammoniaca)'); if (out.energia.riducente > 0 && riducente && !ha('HCN', 'H2CO') && !METALLO_D.test(min) && !energia2) mancano.push('un modo di usare il riducente: solfuri di ferro e nichel, luce o scariche'); if (!(formazione < 0) && isFinite(formazione) && !energia2) mancano.push('energia (luce, scariche, un gradiente)');
    if (attivitaAcqua != null && attivitaAcqua < 1 && (luogo.attivitaAcqua ?? 1) > attivitaAcqua && !luogo.cicliAsciutti && !luogo.attivatore) mancano.push(`un posto che si asciughi (attività dell'acqua sotto ${attivitaAcqua.toPrecision(2)}) o un attivatore`);
    if (luogo.anni != null && luogo.anni < generazioni * 1) mancano.push('tempo');
    return { possibile: mancano.length === 0, mancano }; };
  return out;
}
const METALLO_D = /ferro|nichel|magnetite|pirite|greigite|awaruite|troilite|solfuro/i;
