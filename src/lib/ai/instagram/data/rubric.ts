// Rubrica profilo Instagram: 12 voci, 100 punti. Copia di rubric.json (ig-profile, MIT, Jake Schincariol)
// con label_it / fix_it in italiano. Il peso è voluto: campo nome, prima riga bio e i tre post fissati
// valgono più della foto, perché sono ciò che legge chi arriva da un reel prima di decidere se seguire.

export interface RubricItem {
  id: string;
  points: number;
  full_marks: string;
  common_fail: string;
  label_it: string;
  fix_it: string;
}

export const RUBRIC = {
  version: '1.0',
  total: 100,
  note: 'Twelve items. Score each honestly - a generous score helps nobody. Most first-pass profiles land in the 30s and 40s. The weighting is deliberate: the name field, the first bio line and the pinned three are worth more than the photo, because they are what a stranger who arrived from one reel actually processes before deciding to follow.',
  items: [
    {
      id: 'name_field',
      points: 12,
      full_marks: "The name field (30 characters, the bold line, not the handle) carries the name plus what they do in words people search: 'Dana Ruiz | Proposal templates'. This field is indexed by Instagram search and most accounts waste it on a name alone.",
      common_fail: 'Just a name, or a name with an emoji.',
      label_it: 'Campo nome',
      fix_it: "Nel campo nome (30 caratteri, la riga in grassetto, non l'handle) metti nome + cosa fai con le parole che la gente cerca: 'Giulia Rossi | Brand identity'. È il campo che la ricerca di Instagram indicizza.",
    },
    {
      id: 'bio_first_line',
      points: 12,
      full_marks: 'Line one names who this is for and what changes for them, in their words. Not a job title, not a list of adjectives, not three emoji separated by bars.',
      common_fail: "'Entrepreneur | Coffee lover | Dog dad'.",
      label_it: 'Prima riga della bio',
      fix_it: 'Riscrivi la prima riga: per chi è e cosa cambia per loro, con le loro parole. Niente job title, aggettivi o emoji separate da barre.',
    },
    {
      id: 'bio_body',
      points: 8,
      full_marks: 'The rest of the 150 characters carries one piece of proof or one specific offer, and reads as sentences rather than a pipe-separated list.',
      common_fail: 'Keyword soup, or blank space.',
      label_it: 'Resto della bio',
      fix_it: 'Usa il resto dei 150 caratteri per una prova concreta o una sola offerta specifica, scritta come frase e non come elenco con le barre.',
    },
    {
      id: 'pinned_three',
      points: 10,
      full_marks: 'Three posts pinned to the top of the grid, doing three different jobs: the best proof, the clearest explanation of the offer, and the best introduction to the person. Not the three highest-view posts by accident.',
      common_fail: "Nothing pinned, so the top of the grid is whatever was posted last.",
      label_it: 'Tre post fissati',
      fix_it: "Fissa tre post con tre compiti diversi: la prova migliore, la spiegazione più chiara dell'offerta, la presentazione migliore di te. Bastano quattro tap.",
    },
    {
      id: 'link',
      points: 8,
      full_marks: 'One destination that matches what the bio just promised. Up to five links are allowed; more than two is a menu, and a menu converts worse than a door.',
      common_fail: 'A link tree with eleven options, or no link at all.',
      label_it: 'Link',
      fix_it: 'Un solo link verso ciò che la bio promette. Più di due è già un menu, e un menu converte peggio di una porta.',
    },
    {
      id: 'highlights',
      points: 8,
      full_marks: 'Four to six highlights named for the questions a buyer actually asks: Pricing, Results, How it works, About. Covers consistent. Nothing older than a year sitting at the front.',
      common_fail: "'Random', 'Life', 'Faves', or 14 highlights in no order.",
      label_it: 'Storie in evidenza',
      fix_it: 'Da quattro a sei in evidenza, chiamate come le domande di un cliente: Prezzi, Risultati, Come funziona, Chi sono. Cover coerenti, elimina il resto.',
    },
    {
      id: 'grid_legibility',
      points: 8,
      full_marks: 'The first nine covers are legible at thumbnail size and say what the account is about without a single tap. Reel covers are chosen deliberately, not left as frame one.',
      common_fail: 'Nine covers of a face mid-word with no text.',
      label_it: 'Leggibilità della griglia',
      fix_it: 'Scegli le cover dei primi nove post: leggibili in miniatura, con tre-quattro parole di testo, che dicano di cosa parla il profilo senza tap.',
    },
    {
      id: 'photo',
      points: 6,
      full_marks: 'Face fills roughly 60% of a circle that renders at about 40 pixels. Eyes visible, shot in the last two years, background not competing.',
      common_fail: "A full-body shot, a logo for a personal brand, or a photo taken at arm's length in a dark room.",
      label_it: 'Foto profilo',
      fix_it: 'Volto che riempie circa il 60% del cerchio, occhi visibili, foto degli ultimi due anni, sfondo che non distrae.',
    },
    {
      id: 'handle',
      points: 6,
      full_marks: 'Readable, sayable out loud, and the same handle as the other platforms. No stacked underscores or numbers standing in for letters.',
      common_fail: 'A handle nobody can spell after hearing it once.',
      label_it: 'Handle',
      fix_it: "Un handle leggibile, pronunciabile e uguale sulle altre piattaforme. Niente underscore multipli o numeri al posto delle lettere.",
    },
    {
      id: 'category_contact',
      points: 6,
      full_marks: 'Professional account with a category that matches the offer, and contact buttons that work. Email that is checked, not the one from 2019.',
      common_fail: 'Personal account, so there are no insights and no contact button.',
      label_it: 'Categoria e contatti',
      fix_it: "Passa all'account professionale, scegli una categoria coerente con l'offerta e collega un'email che leggi davvero.",
    },
    {
      id: 'recent_activity',
      points: 10,
      full_marks: 'Posted in the last seven days and replied to comments on the most recent post. An account that last posted in March reads as closed.',
      common_fail: 'A five-week gap, or a wall of unanswered comments.',
      label_it: 'Attività recente',
      fix_it: "Pubblica almeno una volta negli ultimi sette giorni e rispondi ai commenti dell'ultimo post: un profilo fermo sembra chiuso.",
    },
    {
      id: 'story_presence',
      points: 6,
      full_marks: 'A story up right now, or at least most days. It is the difference between a profile and a person.',
      common_fail: 'No ring, ever.',
      label_it: 'Presenza nelle storie',
      fix_it: 'Tieni una storia attiva quasi ogni giorno: è la differenza tra un profilo e una persona.',
    },
  ],
} as const satisfies { version: string; total: number; note: string; items: readonly RubricItem[] };
