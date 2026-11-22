// biblioteca.js — la biblioteca di tutti gli universi possibili.
//
// Come nella biblioteca di Babele di Borges, ogni universo ha un indirizzo: un
// numero. Dal numero il caso (ripetibile) mette nello spazio vuoto solo ciò che
// la natura ci mette:
//   · MASSE sparse, poche grandi e molte piccole;
//   · un CAMPO MAGNETICO che varia dolcemente (una somma di onde), come quello
//     delle galassie e dei plasmi;
//   · NUBI di materia, dense qua e rade là;
//   · qualche CRISTALLO, dove il campo si ripete con il passo del reticolo: la
//     periodicità della natura, l'unica ripetizione che non è una copia;
//   · una PIOGGIA di raggi cosmici che entra dai bordi e, urtando, genera
//     sciami di particelle;
//   · DECADIMENTI spontanei di particelle neutre, qua e là;
//   · qualche STELLA NUCLEARE: un nucleo colpito si spezza in una raggiera di
//     particelle (una «stella»): nel campo le
//     cariche positive e negative si arricciano in versi opposti, in rosette.
// Le particelle sono quelle di un piccolo catalogo naturale, con le loro vite
// medie: ognuna decade quando capita.
//
// Il pattern non si costruisce: si cerca. Si sceglie l'universo, la finestra
// nello spazio e la fetta di tempo da cui guardarlo. Un indirizzo corto può
// contenere solo forme naturali (spirali, rosette, forcelle, ripetizioni
// cristalline); una forma arbitraria è nella biblioteca, ma il suo indirizzo è
// lungo quanto lei.

// Ora ogni numero è un indirizzo nel cosmo (cosmo.js): numeri vicini sono regioni
// vicine dello stesso pianeta, numeri lontani altri pianeti, altre stelle, altre
// galassie; numeri lontanissimi, cosmi paralleli. Ogni cosa in una regione ha una
// causa più in là: i raggi cosmici partono da sorgenti vere della galassia.
import { indirizzoDi, regione, CATALOGO } from './cosmo.js';

export { CATALOGO };
// rami: gli eventi del cosmo andati diversamente (un cosmo parallelo, vedi cosmo.js)
export function universo(numero, rami = null) { return regione(indirizzoDi(numero, rami)); }
