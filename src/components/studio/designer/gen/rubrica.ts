/**
 * La griglia d'esame del critico, in un posto solo: la usano il critico in
 * codice (pesi e soglie) e i ruoli IA che lavorano prima di lui (analista,
 * copywriter, direttore), che così sanno su cosa verranno giudicati e
 * lavorano per passare l'esame invece di scoprirlo dopo.
 */
export type Criterio = 'leggibilita' | 'contenuto' | 'gerarchia' | 'allineamento' | 'respiro' | 'colore' | 'decoro' | 'sperimentazione'

export const RUBRICA: Record<Criterio, { nome: string; peso: number; misura: string; boccia: string }> = {
  leggibilita: { nome: 'Leggibilità', peso: 0.17, misura: 'contrasto di ogni testo su ciò che ha sotto (fondo, campo, foto letta nei suoi pixel), con margine sopra la soglia', boccia: 'testi su foto movimentate o su colori vicini; lettere d\'accento che spariscono' },
  contenuto: { nome: 'Contenuto', peso: 0.13, misura: 'titolo, brand, invito e tutte le voci scritte dal cliente sono sulla tavola, intere', boccia: 'una voce persa, testi presenti solo per metà delle voci, brand assente' },
  gerarchia: { nome: 'Gerarchia', peso: 0.12, misura: 'il titolo è almeno 1,6 volte il testo più grande che non sia un numero; al massimo sei corpi', boccia: 'titolo lungo che deve rimpicciolirsi fino a pareggiare il resto' },
  allineamento: { nome: 'Allineamento', peso: 0.12, misura: 'i bordi dei testi cadono sugli stessi assi dei blocchi vicini; nessun allineamento mancato di pochi pixel', boccia: 'quasi allineati (l\'errore del dilettante), testi su troppi assi' },
  respiro: { nome: 'Respiro', peso: 0.1, misura: 'i testi stanno ad almeno 14 unità dal bordo del loro riquadro e non si accalcano tra gruppi', boccia: 'testi attaccati al bordo di un campo o di una card' },
  colore: { nome: 'Colore', peso: 0.12, misura: 'palette compatta (al massimo 3 tinte vive, 4 per pop e infantile), nessuna coppia di colori quasi uguali', boccia: 'colori simili ma non uguali, troppe tinte, palette dispersa' },
  decoro: { nome: 'Decoro', peso: 0.08, misura: 'segni e ornamenti quanti ne chiede il registro: presenti nei registri espressivi, misurati in quelli sobri', boccia: 'tavola piatta in un registro espressivo, rumore in uno sobrio' },
  sperimentazione: { nome: 'Sperimentazione', peso: 0.16, misura: 'gesti da grafico in proporzione all\'energia: al vivo, sconfinamenti, rotazioni, sovrastampa, foto trattata o in forma, scala, segni a mano, tipografia decorativa', boccia: 'impaginazione ordinata e corretta ma senza un\'idea' },
}

export const SOGLIA = 72
export const ECCELLENTE = 85

/** La griglia in prosa, per i prompt dei ruoli che lavorano prima del critico. */
export function rubricaPerPrompt(ruolo: 'copywriter' | 'direttore' | 'analista') {
  const righe = (Object.keys(RUBRICA) as Criterio[]).map(k => `- ${RUBRICA[k].nome} (${Math.round(RUBRICA[k].peso * 100)}%): ${RUBRICA[k].misura}. Boccia: ${RUBRICA[k].boccia}.`)
  const consiglio = {
    analista: 'Raccogli tutto il contenuto che servirà: una voce che manca o è vaga farà bocciare la tavola per contenuto.',
    copywriter: 'Scrivi pensando all\'esame: titoli corti reggono un corpo grande (gerarchia), voci parallele e complete (contenuto), nessuna parola d\'avanzo che costringa a rimpicciolire.',
    direttore: 'Scegli direzioni che passano l\'esame: energia e densità coerenti con i gesti che chiedi, registro coerente con quanto decoro serve, foto movimentate solo con trattamenti e veli che lasciano leggere.',
  }[ruolo]
  return `Ogni tavola passa poi da un critico severo che accetta solo grafiche eccellenti (voto minimo ${SOGLIA} su 100, eccellenza da ${ECCELLENTE}). Criteri:\n${righe.join('\n')}\n${consiglio}`
}
