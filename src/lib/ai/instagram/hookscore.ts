// Punteggio della prima riga di un Reel sulle cinque proprietà degli hook forti, e classifica
// di un gruppo di hook. Port di hookscore.py (ig-reel, MIT, Jake Schincariol) con supporto italiano.
// Cinque euristiche locali calcolate sul solo testo: NON predicono le view. Separano bene un hook
// vero da uno scritto male (AUC 0.83 nel test originale), quasi per niente i successi di un creator
// dai suoi flop (AUC 0.56). Utili per scartare saluti, preamboli, hook vaghi o troppo lunghi.
// Funzioni pure, nessun accesso a fs/process.

import { HOOK_LIBRARY, type HookFormula } from './data/hooks';
import {
  charLen, elided, findAll, fmt, normTok, pyRound, resolveLang, rx, syllablesIt, words,
  type Lang, type LangOption,
} from './lang';

export type CheckName = 'LENGTH' | 'SPECIFICITY' | 'STAKES' | 'FRONTLOAD' | 'ADDRESS';
export type HookLabel = 'STRONG' | 'OK' | 'WEAK';

export interface CheckResult {
  /** 0-100, più alto è meglio. Arrotondato a 1 decimale. */
  score: number;
  detail: string;
}

export interface HookFormulaMatch {
  id: number;
  name: string;
  name_it: string;
  /** Quale regex ha riconosciuto la formula: `match` (en) o `match_it` (it). */
  matchedBy: Lang;
}

export interface HookScore {
  hook: string;
  lang: Lang;
  checks: Record<CheckName, CheckResult>;
  /** Proprietà più debole (la prima in ordine CHECKS a parità). */
  weakest: CheckName;
  /** Messaggi dei dealbreaker trovati (−15 punti ciascuno). */
  flags: string[];
  /** Punteggio complessivo 0-100, 1 decimale. */
  score: number;
  label: HookLabel;
  formula: HookFormulaMatch | null;
}

export interface HookScoreOptions {
  /** Lingua dell'hook; default 'auto' (euristica a stopword). */
  lang?: LangOption;
}

export const CHECKS: CheckName[] = ['LENGTH', 'SPECIFICITY', 'STAKES', 'FRONTLOAD', 'ADDRESS'];
export const CHECK_LABELS_IT: Record<CheckName, string> = {
  LENGTH: 'LUNGHEZZA',
  SPECIFICITY: 'CONCRETEZZA',
  STAKES: 'POSTA',
  FRONTLOAD: 'ATTACCO',
  ADDRESS: 'DESTINATARIO',
};

// Sillabe al secondo per l'italiano parlato in un Reel (vedi beats.ts per la taratura).
const IT_SYLLABLES_PER_SEC = 5.5;

// ── Lessico inglese (identico all'originale) ────────────────────────────────

const NUMBER_SRC_EN = String.raw`\$\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:%|k\b|x\b|hrs?\b|hours?\b|mins?\b|minutes?\b|days?\b|weeks?\b|months?\b|years?\b)?`;

// "one" e "first" mancano apposta: sono riempitivi molto più spesso che quantità.
const SPOKEN_EN = new Set([
  'zero', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'fifteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
  'thousand', 'million', 'billion', 'dozen', 'half', 'twice', 'triple',
]);
const MONEY_EN = new Set([
  'dollars', 'dollar', 'bucks', 'grand', 'percent', 'cents', 'millionaire', 'billionaire', 'revenue',
  'profit', 'salary', 'rent',
]);
const STAKES_EN = new Set([
  'stop', 'never', 'wrong', 'mistake', 'mistakes', 'lost', 'lose', 'losing', 'cost', 'costs', 'broke',
  'broken', 'failed', 'failure', 'fail', 'nobody', 'no', 'not', "don't", 'dont', "doesn't", "didn't",
  "can't", "won't", 'quit', 'quitting', 'fired', 'deleted', 'delete', 'killed', 'kills', 'kill',
  'replaced', 'replaces', 'cut', 'beat', 'free', 'paid', 'charged', 'hired', 'saved', 'first', 'banned',
  'illegal', 'worst', 'hate', 'hated', 'wasted', 'waste', 'scam', 'lie', 'lied', 'lying', 'truth',
  'secret', 'hidden', 'stole', 'stolen', 'before', 'until', 'instead', 'but', 'except', 'unless',
  'problem', 'risk', 'danger', 'warning', 'regret', 'wish', 'should', "shouldn't", 'still', 'already',
  'only', 'without', 'versus', 'vs', 'actually',
]);
const WEAK_OPENERS_EN = [
  'so', 'ok', 'okay', 'hey', 'hi', 'hello', 'guys', 'yo', 'alright', 'welcome', 'today', 'basically',
  'honestly', 'look', 'listen', 'um', 'just', 'let', 'lets', "let's", 'i wanted', 'i want', 'one of',
  'have you', 'did you', 'do you', 'are you', 'in this', 'in today', 'the thing', 'a lot', 'there is',
  'there are', 'this is', 'it is', 'as a', 'when it', "if you've", 'you know',
];
const IMPERATIVES_EN = new Set([
  'stop', 'steal', 'copy', 'delete', 'try', 'watch', 'read', 'save', 'use', 'build', 'make', 'write',
  'send', 'take', 'start', 'quit', 'never', 'always', "don't", 'dont', 'do', 'put', 'run', 'check',
]);

// ── Lessico italiano ────────────────────────────────────────────────────────

// Cifre con unità o valuta: "18.000 €", "€18k", "1,5 ore", "30%", "6 anni".
const NUMBER_SRC_IT = String.raw`[€$]\s?\d+(?:[.,]\d+)*(?:\s?(?:k|mila|mln)\b)?|\b\d+(?:[.,]\d+)*\s?(?:€|%|k\b|x\b|mila\b|mln\b|euro\b|dollari\b|h\b|ore\b|ora\b|min\b|minuti\b|minuto\b|sec\b|secondi\b|giorni\b|giorno\b|settimane\b|settimana\b|mesi\b|mese\b|anni\b|anno\b)?`;

// "uno/una/un" e "sei" mancano apposta: il primo è un articolo, "sei" quasi sempre è "tu sei".
const SPOKEN_IT = new Set([
  'zero', 'due', 'tre', 'quattro', 'cinque', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici',
  'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove', 'venti',
  'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta', 'cento', 'mille',
  'mila', 'milione', 'milioni', 'miliardo', 'miliardi', 'dozzina', 'decina', 'decine', 'centinaia',
  'migliaia', 'mezzo', 'mezza', 'metà', 'doppio', 'doppia', 'triplo', 'tripla', 'dimezzato', 'raddoppiato',
]);
// Numeri composti scritti in lettere: "diciottomila", "duecento", "trentotto", "seicentomila".
const SPOKEN_COMPOUND_IT = /^(?:due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|tredici|quattordici|quindici|sedici|diciassette|diciotto|diciannove|vent|venti|trent|trenta|quarant|quaranta|cinquant|cinquanta|sessant|sessanta|settant|settanta|ottant|ottanta|novant|novanta|cento|mille|mila|uno|tré)+$/u;
const MONEY_IT = new Set([
  'euro', 'dollari', 'dollaro', 'centesimi', 'percento', 'fatturato', 'profitto', 'profitti', 'guadagno',
  'guadagni', 'stipendio', 'affitto', 'milionario', 'milionaria', 'budget', 'preventivo', 'preventivi',
  'fattura', 'fatture', 'tariffa', 'tariffe', 'compenso',
]);
const STAKES_IT = new Set([
  'smetti', 'smettila', 'smettere', 'basta', 'mai', 'sbagliato', 'sbagliata', 'sbagliati', 'sbagli',
  'sbagliando', 'errore', 'errori', 'sbaglio', 'perso', 'persa', 'persi', 'perse', 'perdere', 'perdi',
  'perdo', 'perdita', 'costo', 'costa', 'costato', 'costata', 'costano', 'rotto', 'fallito', 'fallimento',
  'fallire', 'nessuno', 'niente', 'no', 'non', 'mollato', 'licenziato', 'licenziata', 'cancellato',
  'eliminato', 'ucciso', 'sostituito', 'sostituisce', 'tagliato', 'gratis', 'gratuito', 'pagato',
  'pagata', 'pagare', 'assunto', 'risparmiato', 'risparmiare', 'primo', 'prima', 'vietato', 'illegale',
  'peggiore', 'peggio', 'odio', 'odiavo', 'sprecato', 'spreco', 'sprecare', 'truffa', 'bugia', 'bugie',
  'mentito', 'verità', 'segreto', 'segreti', 'nascosto', 'rubato', 'rubare', 'ruba', 'finché', 'invece',
  'ma', 'però', 'tranne', 'senza', 'problema', 'rischio', 'pericolo', 'attenzione', 'rimpianto',
  'rimpiango', 'vorrei', 'dovresti', 'dovrei', 'ancora', 'già', 'solo', 'soltanto', 'contro', 'davvero',
  'mancante', 'mancava', 'manca', 'fregato',
]);
// Aperture che bruciano il primo secondo. Confronto a parola intera (l'originale usa startswith).
const WEAK_OPENERS_IT = [
  'ciao', 'ehi', 'hey', 'salve', 'buongiorno', 'buonasera', 'raga', 'ragazzi', 'allora', 'dunque',
  'quindi', 'ok', 'okay', 'oggi', 'benvenuti', 'benvenute', 'benvenuto', 'bentornati', 'eccoci',
  'praticamente', 'sinceramente', 'onestamente', 'ascolta', 'ascoltate', 'senti', 'sentite', 'ehm', 'uhm',
  'cioè', 'beh', 'vabbè', 'volevo', 'vorrei', 'voglio', 'uno dei', 'una delle', 'hai mai', 'avete mai',
  'sapevi che', 'lo sapevi', 'in questo', 'nel video', 'la cosa', "c'è", 'ci sono', 'questo è',
  'questa è', 'è un', 'è una', 'se hai', 'sai', 'come sapete', 'come sai', 'parliamo di',
];
const IMPERATIVES_IT = new Set([
  'smetti', 'smettila', 'ruba', 'rubate', 'copia', 'copiate', 'cancella', 'elimina', 'prova', 'provate',
  'guarda', 'guardate', 'leggi', 'salva', 'salvati', 'salvatelo', 'usa', 'costruisci', 'fai', 'scrivi',
  'manda', 'invia', 'prendi', 'inizia', 'comincia', 'molla', 'mai', 'sempre', 'non', 'metti', 'controlla',
  'segui', 'apri', 'chiedi', 'dimentica', 'ricordati', 'segnati', 'fidati', 'commenta', 'dimmi', 'evita',
]);

// ── Regex compilate ─────────────────────────────────────────────────────────

const NUMBER_RE = { en: rx(NUMBER_SRC_EN, 'gi'), it: rx(NUMBER_SRC_IT, 'gi') };
const NUMBER_AT_START = { en: rx(`^(?:${NUMBER_SRC_EN})`, 'i'), it: rx(`^(?:${NUMBER_SRC_IT})`, 'i') };
const PROPER_RE = { en: rx(String.raw`(?<!^)\b[A-Z][a-z]{2,}\b`, 'g'), it: rx(String.raw`(?<!^)\b[A-ZÀ-Ý][a-zà-ÿ]{2,}\b`, 'g') };
const HASHTAG_RE = rx(String.raw`(?:^|\s)#\w+`);
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}☀-➿]/u;
const PRICE_RE = { en: rx(String.raw`\$\s?\d`), it: rx(String.raw`[€$]\s?\d|\d\s?€|\b(?:euro|dollari)\b`, 'i') };
const YOU_RE = {
  en: rx(String.raw`\b(you|your|you're|youre|yourself)\b`),
  // Il soggetto italiano spesso è sottinteso: contano anche i verbi alla seconda persona.
  it: rx(String.raw`\b(?:tu|ti|te|tuo|tua|tuoi|tue|voi|vi|vostro|vostra|vostri|vostre|hai|sei|puoi|devi|vuoi|sai|fai|stai|avete|siete|potete|dovete|volete|sapete|fate|state)\b|\bt'`),
};
const ME_RE = {
  en: rx(String.raw`\b(i|my|me|we|our)\b`),
  it: rx(String.raw`\b(?:io|mio|mia|miei|mie|me|mi|noi|nostro|nostra|nostri|nostre|ho|ero|avevo|abbiamo|siamo|sono)\b`),
};

interface Dealbreaker { re: RegExp; msg: string }

const DB_EN: Dealbreaker[] = [
  { re: rx(String.raw`^\s*(?:stop scrolling|don'?t scroll)`, 'i'),
    msg: 'Apre con «stop scrolling». Chiedere attenzione dimostra che non te la sei guadagnata.' },
  { re: rx(String.raw`\b(?:in (?:this|today'?s) (?:video|reel)|i'?m going to show you|i'?ll show you how)\b`, 'i'),
    msg: 'Preambolo da video. Cancellalo e apri sul risultato.' },
  { re: rx(String.raw`^\s*(?:hey |hi |what'?s up |welcome )`, 'i'),
    msg: 'Saluto. Nessuno apre il feed per farsi salutare.' },
];
const DB_IT: Dealbreaker[] = [
  { re: rx(String.raw`^\s*(?:fermati\b|fermatevi\b|aspetta,? non scorrere|(?:smetti(?:la)?|smettete(?:la)?) di (?:scorrere|scrollare)|non (?:scorrere|scrollare))`, 'i'),
    msg: 'Apre con «smetti di scorrere». Chiedere attenzione dimostra che non te la sei guadagnata.' },
  { re: rx(String.raw`\b(?:in questo (?:video|reel)|nel (?:video|reel) di oggi|oggi (?:vi|ti) (?:parlo|mostro|spiego|faccio vedere|racconto)|oggi parliamo|(?:vi|ti) (?:mostro|faccio vedere|spiego) come|(?:ora|adesso) (?:vi|ti) spiego)\b`, 'i'),
    msg: 'Preambolo da video. Cancellalo e apri sul risultato.' },
  { re: rx(String.raw`^\s*(?:ciao|ehi|ehilà|hey|salve|buongiorno|buonasera|benvenut[ioae]|bentornat[ioae]|eccoci)\b`, 'i'),
    msg: 'Saluto. Nessuno apre il feed per farsi salutare.' },
];
const DB_COMMON: Dealbreaker[] = [
  { re: HASHTAG_RE, msg: "Hashtag nell'hook. Gli hashtag vanno in fondo alla caption, se proprio servono." },
  { re: EMOJI_RE, msg: "Emoji nell'hook. Il testo a schermo in formato hook ha spazio per le parole o per un'emoji, non per entrambe." },
];
// In italiano valgono anche i dealbreaker inglesi: "stop scrolling" e "hey" si sentono pure qui.
const DEALBREAKERS: Record<Lang, Dealbreaker[]> = {
  en: [...DB_EN, ...DB_COMMON],
  it: [...DB_IT, ...DB_EN, ...DB_COMMON],
};

const FORMULAS = HOOK_LIBRARY.classify_order
  .map((id) => HOOK_LIBRARY.hooks.find((h) => h.id === id))
  .filter((h): h is HookFormula => !!h)
  .map((h) => ({ h, en: rx(h.match, 'i'), it: rx(h.match_it, 'i') }));

// ── Helper ──────────────────────────────────────────────────────────────────

const clamp = (n: number): number => Math.max(0, Math.min(100, n));
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

function isSpoken(tok: string, lang: Lang): boolean {
  if (lang === 'en') return SPOKEN_EN.has(tok) || MONEY_EN.has(tok);
  const t = elided(tok);
  return SPOKEN_IT.has(t) || MONEY_IT.has(t) || (t.length >= 6 && SPOKEN_COMPOUND_IT.test(t));
}
const isStake = (tok: string, lang: Lang): boolean =>
  lang === 'en' ? STAKES_EN.has(tok) : STAKES_IT.has(tok) || STAKES_IT.has(elided(tok));

// ── I cinque controlli ──────────────────────────────────────────────────────

type Check = [number, string];

/** Un hook deve arrivare prima che il pollice si muova. Circa due secondi. */
function checkLength(text: string, lang: Lang): Check {
  const w = words(text, lang);
  const n = w.length;
  // EN: ~165 parole/min. IT: stima per sillabe, le parole italiane sono più lunghe.
  const secs = lang === 'en' ? n / 2.75 : w.reduce((a, t) => a + syllablesIt(t), 0) / IT_SYLLABLES_PER_SEC;
  const chars = charLen(text.trim());
  let score: number;
  if (n >= 5 && n <= 12) score = 100;
  else if (n < 5) score = clamp(100 - (5 - n) * 20);
  else score = clamp(100 - (n - 12) * 11);
  if (chars > 60) score -= 12; // due righe di testo grande a schermo
  return [clamp(score), `${n} parole, ${chars} caratteri, ~${fmt(secs)}s parlato (ideale 5-12 parole)`];
}

/** Una cosa concreta batte tre astratte. */
function checkSpecificity(text: string, lang: Lang): Check {
  const nums = findAll(NUMBER_RE[lang], text).map((s) => s.trim()).filter(Boolean);
  const propers = Array.from(new Set(findAll(PROPER_RE[lang], text))).sort();
  const spoken = words(text, lang).map(normTok).filter((t) => isSpoken(t, lang));
  const hits = nums.length + propers.length + spoken.length;
  const score = hits === 0 ? 15 : clamp(45 + hits * 30);
  const found = [...nums.slice(0, 2), ...propers.slice(0, 2), ...spoken.slice(0, 2)].join(', ');
  return [score, `${hits} elementi concreti` + (found ? `: ${found}` : ' - nessun numero, nessun nome, niente di verificabile')];
}

/** Tensione, costo, negazione. Qualcosa che chi guarda potrebbe perdere. */
function checkStakes(text: string, lang: Lang): Check {
  const hits = words(text, lang).map(normTok).filter((t) => isStake(t, lang));
  const markers = Array.from(new Set(hits)).sort();
  if (PRICE_RE[lang].test(text)) markers.push('un prezzo');
  const n = markers.length;
  const score = n === 0 ? 20 : n === 1 ? 70 : 100;
  return [score, `${n} segnali di tensione` + (markers.length ? `: ${markers.slice(0, 4).join(', ')}` : ' - in questa riga non c\'è niente in gioco')];
}

/** La parola interessante non può stare in nona posizione. */
function checkFrontload(text: string, lang: Lang): Check {
  const w = words(text, lang);
  if (!w.length) return [0, 'vuoto'];
  const low = w.map(normTok);
  const opener = low.slice(0, 2).join(' ');
  let penalty = 0;
  let hitOpener: string | null = null;
  const openers = lang === 'en' ? WEAK_OPENERS_EN : WEAK_OPENERS_IT;
  for (const weak of openers) {
    // EN fedele all'originale (startswith grezzo: "so" colpisce anche "something");
    // IT a parola intera, altrimenti "ma" colpirebbe "mamma".
    const hit = lang === 'en'
      ? opener.startsWith(weak) || low[0] === weak
      : opener === weak || opener.startsWith(weak + ' ') || low[0] === weak;
    if (hit) { penalty = 30; hitOpener = weak; break; }
  }
  // Nota: nell'originale PROPER_RE.match(token) non riesce mai (il lookbehind (?<!^) a inizio
  // stringa fallisce sempre), quindi i nomi propri non contano come payload. Comportamento conservato.
  const payload = low.findIndex((t, i) => isStake(t, lang) || isSpoken(t, lang) || NUMBER_AT_START[lang].test(w[i]));
  let base: number;
  let where: string;
  if (payload < 0) { base = 30; where = 'nessuna parola forte nella riga'; }
  else if (payload <= 3) { base = 100; where = `parola forte in posizione ${payload + 1}`; }
  else if (payload <= 6) { base = 70; where = `parola forte in posizione ${payload + 1}, si può anticipare`; }
  else { base = 40; where = `parola forte in posizione ${payload + 1}, troppo tardi`; }
  return [clamp(base - penalty), where + (hitOpener ? `; apertura debole «${hitOpener}»` : '')];
}

/** Rivolto a una persona, o sospeso nel vuoto. */
function checkAddress(text: string, lang: Lang): Check {
  const low = text.toLowerCase();
  const w = words(text, lang).map(normTok);
  if (YOU_RE[lang].test(low)) return [100, 'parla a chi guarda'];
  const imps = lang === 'en' ? IMPERATIVES_EN : IMPERATIVES_IT;
  if (w.length && imps.has(w[0])) return [90, `apre con un imperativo («${w[0]}»)`];
  if (ME_RE[lang].test(low)) return [70, 'prima persona, nessun destinatario'];
  return [35, 'terza persona, non c\'è nessuno nella stanza'];
}

// ── API ─────────────────────────────────────────────────────────────────────

/**
 * Riconosce la formula dell'hook tra le 26 di hooks, scorrendo `classify_order`
 * e provando sia `match` sia `match_it`. Restituisce null se nessuna corrisponde.
 * Con lang 'en' / 'it' usa solo la regex di quella lingua.
 */
export function classifyHook(text: string, opts: HookScoreOptions = {}): HookFormulaMatch | null {
  const lang = opts.lang ?? 'auto';
  for (const { h, en, it } of FORMULAS) {
    const by: Lang | null = lang !== 'it' && en.test(text) ? 'en' : lang !== 'en' && it.test(text) ? 'it' : null;
    if (by) return { id: h.id, name: h.name, name_it: h.name_it, matchedBy: by };
  }
  return null;
}

/** Punteggio di un singolo hook sulle cinque proprietà. */
export function scoreHook(text: string, opts: HookScoreOptions = {}): HookScore {
  const hook = text.trim();
  const lang = resolveLang(hook, opts.lang);
  const raw: Record<CheckName, Check> = {
    LENGTH: checkLength(hook, lang),
    SPECIFICITY: checkSpecificity(hook, lang),
    STAKES: checkStakes(hook, lang),
    FRONTLOAD: checkFrontload(hook, lang),
    ADDRESS: checkAddress(hook, lang),
  };
  const flags = DEALBREAKERS[lang].filter((d) => d.re.test(hook)).map((d) => d.msg);
  const scores = CHECKS.map((c) => raw[c][0]);
  const lo = Math.min(...scores);
  // La proprietà più debole fa da tetto: ne basta una cattiva perché il pollice scorra oltre.
  const overall = clamp(mean(scores) * 0.6 + lo * 0.4 - flags.length * 15);
  const label: HookLabel = overall >= 70 && lo >= 55 && !flags.length ? 'STRONG' : overall >= 50 ? 'OK' : 'WEAK';
  const weakest = CHECKS.reduce((a, c) => (raw[c][0] < raw[a][0] ? c : a), CHECKS[0]);
  const checks = Object.fromEntries(
    CHECKS.map((c) => [c, { score: pyRound(raw[c][0], 1), detail: raw[c][1] }]),
  ) as Record<CheckName, CheckResult>;
  return { hook, lang, checks, weakest, flags, score: pyRound(overall, 1), label, formula: classifyHook(hook) };
}

/** Punteggio di più hook (righe vuote ignorate), ordinati dal migliore. */
export function rankHooks(hooks: string[], opts: HookScoreOptions = {}): HookScore[] {
  return hooks
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => scoreHook(h, opts))
    .sort((a, b) => b.score - a.score);
}

const bar = (score: number, width = 24): string => {
  const filled = pyRound((score / 100) * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
};

/** Report testuale: dettaglio completo per un solo hook, classifica per più hook. */
export function formatHookRanking(results: HookScore[]): string {
  const L: string[] = [];
  if (!results.length) return 'niente da valutare\n';
  if (results.length === 1) {
    const r = results[0];
    L.push('', 'PUNTEGGIO HOOK', '='.repeat(62), `  "${r.hook}"`);
    if (r.formula) L.push(`  formula: #${r.formula.id} ${r.formula.name_it} (${r.formula.name})`);
    L.push('');
    for (const c of CHECKS) {
      const { score, detail } = r.checks[c];
      L.push(`  ${CHECK_LABELS_IT[c].padEnd(13)} ${bar(score)} ${fmt(score).padStart(5)}`);
      L.push(`  ${''.padEnd(13)} ${detail}`);
    }
    L.push('-'.repeat(62));
    L.push(`  ${'PUNTEGGIO'.padEnd(13)} ${bar(r.score)} ${fmt(r.score).padStart(5)}   ${r.label}`);
    for (const f of r.flags) L.push('', `  DEALBREAKER  ${f}`);
    if (r.label !== 'STRONG') L.push('', `  Proprietà più debole: ${CHECK_LABELS_IT[r.weakest]}. Sistema quella e rivaluta.`);
    L.push('');
    return L.join('\n') + '\n';
  }
  const rows = [...results].sort((a, b) => b.score - a.score);
  L.push('', 'CLASSIFICA HOOK', '='.repeat(78));
  rows.forEach((r, i) => {
    const mark = i === 0 ? '->' : '  ';
    const hook = charLen(r.hook) <= 62 ? r.hook : Array.from(r.hook).slice(0, 59).join('') + '...';
    L.push(`${mark} ${fmt(r.score).padStart(5)} ${r.label.padEnd(7)} ${hook}`);
    const formula = r.formula ? `  ·  formula #${r.formula.id} ${r.formula.name_it}` : '';
    L.push(`        più debole: ${CHECK_LABELS_IT[r.weakest]} (${fmt(r.checks[r.weakest].score, 0)})${formula}`);
    for (const f of r.flags) L.push(`        dealbreaker: ${f}`);
  });
  L.push('', 'Gira il primo. Se il primo è sotto 50, nessuno di questi è l\'hook.', '');
  return L.join('\n') + '\n';
}
