// molecole_pozzi.js — I POZZI: quanto dura ogni molecola in acqua (vedi molecole.js per l'intestazione generale).
//
// Ciò che resta in un luogo è sorgente × vita: senza pozzi veri una rete accumula tutto per sempre. Le regole generali
// (una barriera intrinseca per famiglia, molecole_reazioni.js) NON bastano a dare le vite misurate dei legami della
// vita: a 25 °C e pH 7 danno 11 anni al legame peptidico (misurato 385), 82 anni al glicoside (4 milioni), 4 anni al
// fosfodiestere senza ossidrile vicino (31 milioni), e nessuna via alla deamminazione delle basi. Perciò qui le vite
// entrano come DATI MISURATI DICHIARATI, per CLASSE DI LEGAME riconosciuta sul grafo (non per molecola): ogni legame di
// quella classe, in qualsiasi molecola, ha quella vita; una molecola con n legami si rompe n volte più in fretta.
//
// DATI (tutti a pH 7; forma di Arrhenius k = k₀·exp(−Ea/R·(1/T − 1/T₀))):
//   · legame ammidico (peptide): t½ 385 anni a 25 °C, Ea 25,2 kcal/mol; glicoside: 4 milioni di anni, 31,5 kcal/mol;
//     fosfodiestere dell'RNA (con un ossidrile sul carbonio vicino, che attacca il fosforo dall'interno): 5 anni,
//     15,6 kcal/mol — Ross e Deamer 2016, Life 6, 28, tab. 1 (pmc.ncbi.nlm.nih.gov/articles/PMC5041004);
//   · fosfodiestere senza ossidrile vicino (DNA): k = 7·10⁻¹⁶ 1/s a 25 °C, ΔH‡ 29,5 kcal/mol (t½ 31 milioni di anni) —
//     Schroeder, Lad, Wyman, Williams e Wolfenden 2006, PNAS 103, 4052;
//   · basi: k = 10^(−B/T + A) 1/s con (B, A) = adenina (5902; 8,15), guanina (6330; 9,40), uracile (7649; 11,76),
//     citosina (5620; 8,69) — Pearce, Pudritz, Semenov e Henning 2017, PNAS 114, 11327, eq. S25-S28, dalle misure di
//     Levy e Miller 1998, PNAS 95, 7933 (citosina: 19 giorni a 100 °C, 340 anni a 25 °C; adenina 1 anno a 100 °C);
//   · zuccheri (aldosi e chetosi liberi): t½ 73 minuti a 100 °C, 44 anni a 0 °C (ribosio; gli altri entro un ordine di
//     grandezza) — Larralde, Robertson e Miller 1995, PNAS 92, 8158; l'energia di attivazione (107 kJ/mol) è ricavata
//     qui da quei due punti;
//   · ΔG°′ di condensazione in acqua: peptide +9,2, fosfodiestere +13,8, glicoside +15,9 kJ/mol — Ross e Deamer 2016.
//     Il peptide ESCE dalle regole generali (molecole_energia.js dà +8 per Gly + Gly); gli altri due no (+26 e +5): per
//     quelli si usa il dato.
// LE CLASSI (regole sul grafo, chiuse):
//   ammide      C(=O)–N non aromatico (non le uree: C con due N);
//   glicoside   carbonio saturo con due eteroatomi, uno dei quali un ossigeno d'anello e l'altro un O–C o un N fuori
//               dall'anello (acetale ciclico: glicosidi e nucleosidi);
//   fosfodiestere   P con almeno due O–C; «RNA» se un carbonio vicino a uno dei due porta un O–H;
//   deamminazione   –NH2 su un carbonio aromatico che ha accanto un azoto d'anello; tre sottoclassi dalla forma dell'anello:
//               anello singolo (citosina), anelli fusi (adenina), anelli fusi con un C=O (guanina);
//   apertura dell'anello   anello aromatico singolo con N–C(=O)–N e senza –NH2 (uracile; la timina, 5 volte più lenta, no);
//   zucchero    un carbonile (aldeide o chetone), il suo idrato o un emiacetale, con un O–H sul carbonio accanto.
// SEMPLIFICAZIONI: il pH conta solo per l'RNA (k ∝ [OH⁻] tra pH 5 e 13 [ricordato: Li e Breaker 1999]); fuori da pH
// 4,5-9 le vite delle basi non valgono (lo dice «fuoriIntervallo»); niente catalisi da ioni metallici sui pozzi; i
// prodotti degli zuccheri e dell'uracile non sono seguiti (escono dalla rete come «catrame»).

import { molecola, chiave, anelli } from './molecole_grafo.js';
import { ZERO_CELSIUS, R_GAS, ANNO } from './leggi.js'; // le costanti e le unità: un posto solo

const R = R_GAS / 1000, KCAL = 4.184, T0 = 298.15; // (kJ/mol/K; R e l'anno da leggi.js)
const arr = (t12anni, EaKcal) => ({ k0: Math.LN2 / (t12anni * ANNO), Ea: EaKcal * KCAL, T0 });
const base = (B, A) => ({ k0: Math.pow(10, -B / T0 + A), Ea: B * Math.LN10 * R, T0 });
export const POZZI = {
  ammide: { ...arr(385, 25.2), nome: 'idrolisi del legame ammidico', fonte: 'Ross e Deamer 2016' },
  glicoside: { ...arr(4e6, 31.5), nome: 'idrolisi del glicoside', fonte: 'Ross e Deamer 2016' },
  rna: { ...arr(5, 15.6), nome: 'rottura del fosfodiestere con ossidrile vicino (RNA)', fonte: 'Ross e Deamer 2016', pH: 1 },
  dna: { k0: 7e-16, Ea: 29.5 * KCAL, T0, nome: 'idrolisi del fosfodiestere (DNA)', fonte: 'Schroeder e altri 2006' },
  citosina: { ...base(5620, 8.69), nome: 'deamminazione (anello singolo)', fonte: 'Levy e Miller 1998, in Pearce e altri 2017', finestraPH: [4.5, 9] },
  adenina: { ...base(5902, 8.15), nome: 'deamminazione (anelli fusi)', fonte: 'Levy e Miller 1998, in Pearce e altri 2017', finestraPH: [4.5, 9] },
  guanina: { ...base(6330, 9.40), nome: 'deamminazione (anelli fusi con C=O)', fonte: 'Levy e Miller 1998, in Pearce e altri 2017', finestraPH: [4.5, 9] },
  uracile: { ...base(7649, 11.76), nome: 'apertura dell\'anello', fonte: 'Levy e Miller 1998, in Pearce e altri 2017', finestraPH: [4.5, 9] },
  zucchero: { k0: Math.LN2 / (73 * 60), Ea: (R * Math.log((44 * ANNO) / (73 * 60))) / (1 / ZERO_CELSIUS - 1 / 373.15), T0: 373.15, nome: 'decomposizione dello zucchero', fonte: 'Larralde, Robertson e Miller 1995' },
};
// ΔG°′ di condensazione in acqua a pH 7 (kJ/mol), misurati; «regola»: se le regole generali lo danno da sé
export const CONDENSAZIONE_MISURATA = { peptide: { dG: 9.2, regola: true }, fosfodiestere: { dG: 13.8, regola: false }, glicosidico: { dG: 15.9, regola: false }, fonte: 'Ross e Deamer 2016' };
const CLASSE_DI_LEGAME = { ammide: 'peptide', glicoside: 'glicosidico', rna: 'fosfodiestere', dna: 'fosfodiestere' };

// la costante di velocità (1/s) di un legame di quella classe
export function kDiClasse(classe, { T = 298.15, pH = 7 } = {}) { const p = POZZI[classe]; let k = p.k0 * Math.exp((-p.Ea / R) * (1 / T - 1 / p.T0)); if (p.pH) k *= Math.pow(10, Math.min(13, Math.max(5, pH)) - 7); return k; }

// quanti legami di ogni classe ha una molecola → { ammide: n, glicoside: n, rna: n, dna: n, citosina: n, adenina: n, guanina: n, uracile: n, zucchero: 0|1, siti: { classe: [atomi] } }
const CLASSI = new Map();
export function classi(x) {
  const nome = typeof x === 'string' ? x : null; if (nome && CLASSI.has(nome)) return CLASSI.get(nome);
  const m = typeof x === 'string' ? molecola(x) : x.m || x, A = m.atomi, n = A.length, vic = Array.from({ length: n }, () => []);
  for (const l of m.legami) { if (l.t === 'i') continue; vic[l.a].push({ j: l.b, o: l.o, ar: l.ar }); vic[l.b].push({ j: l.a, o: l.o, ar: l.ar }); }
  const an = anelli(m), quanti = new Array(n).fill(0); for (const a of an) for (const i of a) quanti[i]++;
  const stessoAnello = (i, j) => an.some((a) => a.includes(i) && a.includes(j)), Z = (i) => A[i].Z, haO2 = (i) => vic[i].some((v) => Z(v.j) === 8 && v.o === 2), OH = (i) => vic[i].some((v) => Z(v.j) === 8 && v.o === 1 && A[v.j].h > 0);
  const out = { ammide: 0, glicoside: 0, rna: 0, dna: 0, citosina: 0, adenina: 0, guanina: 0, uracile: 0, zucchero: 0, siti: {} }, segna = (c, i) => { out[c]++; (out.siti[c] ||= []).push(i); };
  for (let i = 0; i < n; i++) { const a = A[i];
    if (a.Z === 6 && !a.ar) {
      const azoti = vic[i].filter((v) => Z(v.j) === 7 && v.o === 1 && !A[v.j].ar);
      if (haO2(i) && azoti.length === 1 && !vic[i].some((v) => Z(v.j) === 8 && v.o === 1)) segna('ammide', i);
      if (vic[i].every((v) => v.o === 1)) { const etero = vic[i].filter((v) => Z(v.j) === 8 || Z(v.j) === 7);
        if (etero.length >= 2) { const dAnello = etero.find((v) => Z(v.j) === 8 && A[v.j].h === 0 && stessoAnello(i, v.j)), fuori = dAnello && etero.find((v) => v !== dAnello && !stessoAnello(i, v.j) && (Z(v.j) === 7 || (Z(v.j) === 8 && A[v.j].h === 0))); if (fuori) segna('glicoside', i); } }
    }
    if (a.Z === 15) { const esteri = vic[i].filter((v) => Z(v.j) === 8 && v.o === 1 && vic[v.j].some((w) => w.j !== i && Z(w.j) === 6)).map((v) => vic[v.j].find((w) => w.j !== i && Z(w.j) === 6).j);
      if (esteri.length >= 2) segna(esteri.some((c) => vic[c].some((w) => Z(w.j) === 6 && OH(w.j))) ? 'rna' : 'dna', i); }
    if (a.Z === 7 && a.h === 2 && !a.ar && vic[i].length === 1) { const c = vic[i][0].j;
      if (A[c].ar && vic[c].some((v) => Z(v.j) === 7 && A[v.j].ar)) { const mio = an.filter((r) => r.includes(c)), fusi = mio.some((r) => r.some((k) => quanti[k] > 1)), sistema = new Set(mio.flat()); if (fusi) for (const r of an) if (r.some((k) => sistema.has(k))) for (const k of r) sistema.add(k);
        segna(!fusi ? 'citosina' : [...sistema].some((k) => Z(k) === 6 && haO2(k)) ? 'guanina' : 'adenina', i); } }
  }
  // l'anello dell'uracile: un anello aromatico solo, con N–C(=O)–N, senza ammine da perdere prima
  if (!out.citosina) for (const r of an) if (r.every((k) => A[k].ar && quanti[k] === 1) && r.some((k) => Z(k) === 6 && haO2(k) && vic[k].filter((v) => Z(v.j) === 7 && r.includes(v.j)).length === 2)) segna('uracile', r[0]);
  // lo zucchero: carbonile (non acido, non ammide, non estere) o emiacetale, con un O–H sul carbonio accanto
  for (let i = 0; i < n && !out.zucchero; i++) { if (Z(i) !== 6 || A[i].ar) continue; const etero1 = vic[i].filter((v) => v.o === 1 && (Z(v.j) === 8 || Z(v.j) === 7));
    const carbonile = haO2(i) && etero1.length === 0, emiacetale = vic[i].every((v) => v.o === 1) && OH(i) && vic[i].some((v) => Z(v.j) === 8 && A[v.j].h === 0);
    const idrato = vic[i].every((v) => v.o === 1) && vic[i].filter((v) => Z(v.j) === 8 && A[v.j].h > 0).length >= 2; // (l'aldeide idratata è ancora lo zucchero)
    if ((carbonile || emiacetale || idrato) && vic[i].some((v) => Z(v.j) === 6 && !A[v.j].ar && vic[v.j].every((w) => w.o === 1) && OH(v.j))) segna('zucchero', i); }
  if (nome) CLASSI.set(nome, out); return out;
}

// pozzi(x, { T, pH }) → { k (1/s, totale), vita (s, = 1/k), mezzaVita (s), voci: [{ classe, nome, legami, k, Ea, fonte }], fuoriIntervallo }
// (solo i pozzi MISURATI per classe; quelli delle regole generali — e la fotolisi — li aggiunge pozzi() di molecole.js)
export function pozziMisurati(x, { T = 298.15, pH = 7 } = {}) {
  const c = classi(x), voci = []; let k = 0, fuori = false;
  for (const cl in POZZI) if (c[cl] > 0) { const kk = c[cl] * kDiClasse(cl, { T, pH }), p = POZZI[cl]; voci.push({ classe: cl, nome: p.nome, legami: c[cl], k: kk, Ea: p.Ea, fonte: p.fonte, misurato: true }); k += kk; if (p.finestraPH && (pH < p.finestraPH[0] || pH > p.finestraPH[1])) fuori = true; }
  return { k, vita: 1 / k, mezzaVita: Math.LN2 / k, voci, fuoriIntervallo: fuori };
}

// misurato(r, condizioni): se la reazione r (reagenti, prodotti: chiavi) rompe con l'acqua, o forma togliendo acqua, UN
// legame di una classe misurata, → { classe, verso: +1 (idrolisi) | −1 (condensazione), k (idrolisi, 1/s per attività
// dell'acqua 1), dG (dell'idrolisi, kJ/mol: misurato dove le regole non lo danno, altrimenti null) }; se no → null
const IDROLISI = ['ammide', 'glicoside', 'rna', 'dna'];
export function misurato(r, cond = {}) {
  const haAcqua = (l) => l.includes('O'); let verso = 0; if (haAcqua(r.reagenti) && !haAcqua(r.prodotti)) verso = 1; else if (haAcqua(r.prodotti) && !haAcqua(r.reagenti)) verso = -1; else return null;
  const conta = (l) => { const s = {}; for (const k of l) { if (k === 'O') continue; const c = classi(k); for (const cl of IDROLISI) s[cl] = (s[cl] || 0) + c[cl]; } return s; }, a = conta(r.reagenti), b = conta(r.prodotti);
  let classe = null, altri = 0; for (const cl of IDROLISI) { const d = (a[cl] || 0) - (b[cl] || 0); if (d === verso && !classe) classe = cl; else if (d !== 0) altri++; }
  // (un fosfodiestere dell'RNA che si rompe può lasciare un «dna» in meno e nient'altro: una classe sola deve cambiare, di uno)
  if (!classe || altri) return null;
  const mis = CONDENSAZIONE_MISURATA[CLASSE_DI_LEGAME[classe]];
  return { classe, verso, k: kDiClasse(classe, cond), dG: mis.regola ? null : -mis.dG };
}

// LA BARRIERA DELLA SOSTITUZIONE SU QUESTI CENTRI. La famiglia «sostituzione» ha una barriera intrinseca sola (135 kJ/mol):
// sul carbonile di un'ammide, sul carbonio anomerico, sul fosforo di un diestere sbaglia sempre dalla stessa parte. Di
// quanto, lo dicono le vite misurate dell'idrolisi (a 25 °C: Gly-Gly 11 anni dalle regole contro 385; metil-riboside 82
// contro 4 milioni; dimetilfosfato 4,3 contro 31 milioni): RT·ln del rapporto, in kJ/mol. La stessa correzione vale
// per ogni altro nucleofilo che attacca quel centro (un'ammina, un ossidrile della stessa molecola): è un dato per
// CLASSE DI CENTRO, non per molecola. Per il fosfodiestere con l'ossidrile vicino vale direttamente la vita misurata.
export const CORREZIONE_DI_CENTRO = { ammide: 8.8, glicoside: 26.8, dna: 39.2 };
// correzioneDiCentro(r, cond) → null | { classe, dBarriera (kJ/mol) } | { classe: 'rna', k (1/s), verso }
export function correzioneDiCentro(r, cond = {}) {
  if (r.tipo !== 'sostituzione' || (r.classe !== 'anomerico' && r.classe !== 'acile')) return null;
  const conta = (l) => { const s = { ammide: 0, glicoside: 0, rna: 0, dna: 0 }; for (const k of l) { if (k === 'O') continue; const c = classi(k); for (const cl of IDROLISI) s[cl] += c[cl]; } return s; }, a = conta(r.reagenti), b = conta(r.prodotti);
  if (r.classe === 'anomerico') return a.glicoside + b.glicoside > 0 ? { classe: 'glicoside', dBarriera: CORREZIONE_DI_CENTRO.glicoside } : null;
  if (a.rna !== b.rna) return { classe: 'rna', k: kDiClasse('rna', cond), verso: a.rna > b.rna ? 1 : -1 };
  if (a.dna !== b.dna || (a.rna + a.dna > 0 && b.rna + b.dna > 0 && a.ammide === b.ammide)) return { classe: 'dna', dBarriera: CORREZIONE_DI_CENTRO.dna }; // (anche il diestere che cambia alcol)
  if (a.ammide !== b.ammide || (a.ammide > 0 && b.ammide > 0)) return { classe: 'ammide', dBarriera: CORREZIONE_DI_CENTRO.ammide }; // (anche l'ammide che passa da un azoto a un altro: la dichetopiperazina)
  return null;
}

// i pozzi che le regole generali non hanno come reazione: deamminazione (→ la forma con O–H al posto di NH2, più
// ammoniaca), apertura dell'anello e decomposizione degli zuccheri (prodotti non seguiti) → [{ classe, k, prodotti: [chiavi] | [] }]
export function pozziPropri(x, cond = {}) {
  const c = classi(x), out = [], m = typeof x === 'string' ? molecola(x) : x.m || x;
  for (const cl of ['citosina', 'adenina', 'guanina']) for (const i of c.siti[cl] || []) { let prodotti = [];
    try { const g = { ...m, atomi: m.atomi.map((a, j) => (j === i ? { ...a, Z: 8, h: 1 } : { ...a })), legami: m.legami.map((l) => ({ ...l })) }; prodotti = [chiave(g), 'N']; } catch { prodotti = []; }
    out.push({ classe: cl, k: kDiClasse(cl, cond), prodotti }); }
  for (const cl of ['uracile', 'zucchero']) if (c[cl]) out.push({ classe: cl, k: c[cl] * kDiClasse(cl, cond), prodotti: [] });
  return out;
}
