// Pannello a cinque controlli che stima quanto una bozza sembri scritta da una macchina.
// Port di detect.py (ig-human, MIT, Jake Schincariol) con estensioni per l'italiano
// (numeri in lettere, €, mesi e giorni, nomi propri accentati, lessico e segnali IT).
// Funzioni pure, nessun accesso a fs/process: utilizzabile lato server.
//
// Sono euristiche locali modellate sui segnali dei detector pubblici. NON sono GPTZero,
// Originality, Copyleaks, Winston o Turnitin e non ne promettono il verdetto.
// Ogni controllo restituisce un punteggio UMANO da 0 a 100: più alto è meglio.

import { SLOP, type Lexicon, type SlopLang } from './data/slop';
import {
  type HumanizeLang,
  SENT_RE,
  WB,
  countFormatChars,
  countMatches,
  entryRegex,
  lexEntries,
  pyRegex,
  pySplit,
  resolveLang,
  structureRegex,
  structuresFor,
} from './humanize';

export const DETECT_CHECKS = ['BURSTINESS', 'SPECIFICITY', 'SLOP DENSITY', 'FINGERPRINT', 'VOICE'] as const;
export type DetectCheckName = (typeof DETECT_CHECKS)[number];
export type DetectVerdict = 'PASS' | 'REVIEW' | 'FLAGGED';

export interface DetectCheck {
  /** 0-100, più alto = più umano. Non arrotondato (il report usa una cifra decimale). */
  score: number;
  detail: string;
}

export interface DetectResult {
  lang: SlopLang;
  checks: Record<DetectCheckName, DetectCheck>;
  /** Media al 60% + controllo più debole al 40%. */
  humanScore: number;
  verdict: DetectVerdict;
  weakest: DetectCheckName;
}

export interface DetectComparison {
  before: DetectResult;
  after: DetectResult;
  /** Differenza dei punteggi arrotondati a una cifra, come l'originale. */
  delta: number;
}

export interface DetectOptions {
  /** 'en' = identico all'originale; 'it' = marcatori e lessico italiani; 'auto' (default) = rileva. */
  lang?: HumanizeLang;
  lexicon?: Lexicon;
}

/** Soglie del verdetto: PASS richiede 70+ complessivo e nessun controllo sotto 55. */
export const PASS_OVERALL = 70;
export const PASS_MIN_CHECK = 55;
export const REVIEW_OVERALL = 50;

// --- Regex originali (inglese) -------------------------------------------------------------
const WORD_EN = /[A-Za-z']+/g;
const CONTRACTIONS = pyRegex("\\b\\w+'(?:s|t|re|ve|ll|d|m)\\b", 'gi');
const PRONOUNS_EN = pyRegex('\\b(i|me|my|mine|we|us|our|you|your)\\b', 'gi');
const NUMBERS_EN = pyRegex('\\b\\d[\\d,.]*%?\\b|\\$\\d', 'g');
const PROPER_EN = pyRegex('(?<![.!?]\\s)(?<!^)\\b[A-Z][a-z]{2,}\\b', 'gm');
const BULLETS = /^\s*[-*•]\s+(.+)$/gm;

// --- Estensioni italiane -------------------------------------------------------------------
const WORD_IT = /[\p{L}'’]+/gu;
const NUMBERS_IT = pyRegex('\\b\\d[\\d,.]*%?\\b|[$€£]\\s?\\d', 'g');
const NUMBER_WORDS_IT = pyRegex(
  '(?i)\\b(?:due|tre|quattro|cinque|sette|otto|nove|dieci|undici|dodici|tredici|quattordici|quindici|sedici|' +
    'diciassette|diciotto|diciannove|mila|milione|milioni|miliardo|miliardi|dozzina|metà)\\b' +
    '|\\b(?:vent|trent|quarant|cinquant|sessant|settant|ottant|novant)' +
    '(?:[ai](?:due|tre|tré|quattro|cinque|sei|sette|nove)?|uno|una|otto)\\b' +
    '|\\b(?:cento|duecento|trecento|quattrocento|cinquecento|seicento|settecento|ottocento|novecento|' +
    'mille|duemila|tremila|diecimila|centomila)\\p{L}*\\b',
  'g',
);
const DATES_IT = pyRegex(
  '(?i)\\b(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|' +
    'lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica)\\b',
  'g',
);
// Maiuscola non a inizio frase/riga, né dopo emoji/punti elenco a inizio riga, né dopo « o ":".
const PROPER_IT = new RegExp(
  `(?<![.!?:«"“]\\s*)(?<!^[^\\p{L}\\n]*)${WB}[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{2,}${WB}`,
  'gmu',
);
const PROPER_STOP_IT = new Set(
  ('Il Lo La Gli Le Un Una Uno Questo Questa Questi Queste Quello Quella Ecco Non Per Che Come Quando Ma Se Poi ' +
    'Anche Ogni Tutto Tutti Oggi Ieri Domani Io Tu Noi Voi Lui Lei Loro Ciao Grazie Sono Hai Del Della Nel Nella ' +
    'Con Dal Dalla Sul Sulla Cosa Perché Mentre Dopo Prima Qui Ora Adesso Mai Sempre Già Più').split(' '),
);
const COLLOQUIAL_IT = pyRegex(
  "(?i)\\b(?:tipo|boh|beh|mah|insomma|cioè|ok|okay|vabbè|vabbe|mica|figurati|magari|praticamente|eh|ah|oh|ehi|" +
    "un sacco)\\b|\\bpo['’]|\\bc['’](?:è|era|erano|ho)\\b|\\b(?:com|cos|dov|quand)['’]è\\b",
  'g',
);
const PRONOUNS_IT = pyRegex(
  '(?i)\\b(?:io|me|mi|mio|mia|miei|mie|noi|ci|ce|nostro|nostra|nostri|nostre|tu|te|ti|tuo|tua|tuoi|tue|' +
    'voi|vi|ve|vostro|vostra|vostri|vostre)\\b',
  'g',
);
/** In italiano ’ è l'apostrofo che iOS mette da solo (l’idea, po’): non è impronta. */
const ELISION_CURLY = /(?<=\p{L})’(?=\p{L})|(?<![\p{L}])po’/giu;

// --- Matematica ------------------------------------------------------------------------------
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** Mappa value su 0-100: `human` → 100, `machine` → 0. */
function scale(value: number, human: number, machine: number): number {
  if (human === machine) return 50;
  return clamp(((value - machine) / (human - machine)) * 100);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pstdev = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
};

function sentences(text: string): string[] {
  return (text.match(SENT_RE) ?? []).map((s) => s.trim()).filter((s) => pySplit(s).length > 2);
}

function words(text: string, lang: SlopLang): string[] {
  return text.match(lang === 'it' ? WORD_IT : WORD_EN) ?? [];
}

// --- Controlli ---------------------------------------------------------------------------------
type Check = [number, string];

/** Gli umani variano molto la lunghezza delle frasi. I modelli scrivono uniforme. */
function checkBurstiness(text: string, it: boolean): Check {
  const lens = sentences(text).map((s) => pySplit(s).length);
  if (lens.length < 4) return [50, it ? 'troppo corto per giudicare' : 'too short to judge'];
  const m = mean(lens);
  const cv = m ? pstdev(lens) / m : 0;
  const score = scale(cv, 0.7, 0.22);
  return [
    score,
    it
      ? `variazione ${cv.toFixed(2)} su ${lens.length} frasi (meglio 0.55+)`
      : `variation ${cv.toFixed(2)} across ${lens.length} sentences (want 0.55+)`,
  ];
}

/** Numeri, nomi e cose concrete. Lo slop è astratto. */
function checkSpecificity(text: string, lang: SlopLang): Check {
  const it = lang === 'it';
  const w = words(text, lang);
  if (w.length < 25) return [50, it ? 'troppo corto per giudicare' : 'too short to judge'];
  let hits: number;
  if (it) {
    const proper = new Set((text.match(PROPER_IT) ?? []).filter((p) => !PROPER_STOP_IT.has(p)));
    hits =
      countMatches(NUMBERS_IT, text) + countMatches(NUMBER_WORDS_IT, text) + countMatches(DATES_IT, text) + proper.size;
  } else {
    hits = countMatches(NUMBERS_EN, text) + new Set(text.match(PROPER_EN) ?? []).size;
  }
  const density = (hits * 100) / w.length;
  const score = scale(density, 6.0, 0.5);
  return [
    score,
    it
      ? `${hits} marcatori concreti, ${density.toFixed(1)} ogni 100 parole (meglio 4+)`
      : `${hits} concrete markers, ${density.toFixed(1)} per 100 words (want 4+)`,
  ];
}

/** Densità di vocabolario di serie rispetto al lessico. */
function checkSlop(text: string, lex: Lexicon, lang: SlopLang): Check {
  const it = lang === 'it';
  const w = words(text, lang);
  if (!w.length) return [50, it ? 'vuoto' : 'empty'];
  let hits = 0;
  const found: string[] = [];
  for (const entry of lexEntries(lex, lang, 'words-first')) {
    const n = countMatches(entryRegex(entry), text);
    if (n) {
      hits += n;
      found.push(entry.find);
    }
  }
  const density = (hits * 100) / w.length;
  const score = scale(density, 0.0, 4.0);
  let detail = it
    ? `${hits} termini di serie, ${density.toFixed(1)} ogni 100 parole`
    : `${hits} stock terms, ${density.toFixed(1)} per 100 words`;
  if (found.length) {
    const sorted = [...found].sort();
    detail += ' (' + sorted.slice(0, 4).join(', ') + (found.length > 4 ? ', ...' : '') + ')';
  }
  return [score, detail];
}

/** Caratteri che la tastiera di un telefono non produce. */
function checkFingerprint(text: string, lang: SlopLang): Check {
  const it = lang === 'it';
  const invisible = countFormatChars(text);
  const em = text.split('—').length - 1;
  let curly = [...text].filter((c) => '‘’“”'.includes(c)).length;
  if (it) curly -= countMatches(ELISION_CURLY, text);
  const ellip = text.split('…').length - 1;
  const nbsp = [...text].filter((c) => c === '\u00A0' || c === '\u202F' || c === '\u2009').length;
  const total = invisible * 4 + em * 2 + curly + ellip + nbsp;
  const per1k = (total * 1000) / Math.max([...text].length, 1);
  const score = scale(per1k, 0.0, 12.0);
  return [
    score,
    it
      ? `${invisible} invisibili, ${em} lineette, ${curly} virgolette curve, ${ellip} puntini, ${nbsp} spazi rigidi`
      : `${invisible} invisible, ${em} em dash, ${curly} curly quote, ${ellip} ellipsis, ${nbsp} hard space`,
  ];
}

/** Contrazioni (in italiano: colloquialismi), persona e forme di default dei modelli. */
function checkVoice(text: string, lex: Lexicon, lang: SlopLang): Check {
  const it = lang === 'it';
  const w = words(text, lang);
  if (w.length < 25) return [50, it ? 'troppo corto per giudicare' : 'too short to judge'];
  const per100 = 100 / w.length;
  const casual = countMatches(it ? COLLOQUIAL_IT : CONTRACTIONS, text) * per100;
  const person = countMatches(it ? PRONOUNS_IT : PRONOUNS_EN, text) * per100;
  let tells = 0;
  const names: string[] = [];
  for (const s of structuresFor(lex, lang)) {
    const re = structureRegex(s);
    if (!re) continue;
    const n = countMatches(re, text);
    if (n) {
      tells += n;
      names.push(s.id);
    }
  }
  const bullets = [...text.matchAll(BULLETS)].map((m) => pySplit(m[1]).length);
  const uniform = bullets.length >= 3 && pstdev(bullets) < 1.6;
  let score =
    scale(casual, 3.0, 0.0) * 0.35 + scale(person, 8.0, 1.0) * 0.35 + clamp(100 - tells * 22) * 0.3;
  if (uniform) {
    score -= 12;
    names.push('uniform-bullets');
  }
  let detail = it
    ? `${casual.toFixed(1)} colloquialismi, ${person.toFixed(1)} pronomi personali ogni 100 parole, ${tells} segnali strutturali`
    : `${casual.toFixed(1)} contractions, ${person.toFixed(1)} personal pronouns per 100 words, ${tells} structural tell(s)`;
  if (names.length) detail += ' [' + names.slice(0, 4).join(', ') + ']';
  return [clamp(score), detail];
}

// --- API -----------------------------------------------------------------------------------------

export function detect(text: string, opts: DetectOptions = {}): DetectResult {
  const lex = opts.lexicon ?? SLOP;
  const lang = resolveLang(text, opts.lang);
  const it = lang === 'it';
  const raw: Record<DetectCheckName, Check> = {
    BURSTINESS: checkBurstiness(text, it),
    SPECIFICITY: checkSpecificity(text, lang),
    'SLOP DENSITY': checkSlop(text, lex, lang),
    FINGERPRINT: checkFingerprint(text, lang),
    VOICE: checkVoice(text, lex, lang),
  };
  const checks = {} as Record<DetectCheckName, DetectCheck>;
  for (const k of DETECT_CHECKS) checks[k] = { score: raw[k][0], detail: raw[k][1] };
  const scores = DETECT_CHECKS.map((k) => checks[k].score);
  const low = Math.min(...scores);
  // Il controllo più debole trascina il verdetto: a un detector basta un segnale.
  const humanScore = mean(scores) * 0.6 + low * 0.4;
  const verdict: DetectVerdict =
    humanScore >= PASS_OVERALL && low >= PASS_MIN_CHECK ? 'PASS' : humanScore >= REVIEW_OVERALL ? 'REVIEW' : 'FLAGGED';
  let weakest: DetectCheckName = DETECT_CHECKS[0];
  for (const k of DETECT_CHECKS) if (checks[k].score < checks[weakest].score) weakest = k;
  return { lang, checks, humanScore, verdict, weakest };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Prima/dopo con la stessa lingua (rilevata su `before` se 'auto'). */
export function compareDetect(before: string, after: string, opts: DetectOptions = {}): DetectComparison {
  const lang = resolveLang(before, opts.lang);
  const a = detect(before, { ...opts, lang });
  const b = detect(after, { ...opts, lang });
  return { before: a, after: b, delta: round1(round1(b.humanScore) - round1(a.humanScore)) };
}

/** round() di Python (metà al pari), per la barra identica all'originale. */
function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

function bar(score: number, width = 24): string {
  const filled = roundHalfEven((score / 100) * width);
  return '#'.repeat(filled) + '.'.repeat(width - filled);
}

const f1 = (n: number) => n.toFixed(1).padStart(5);

function renderPanel(r: DetectResult, label?: string): string[] {
  const it = r.lang === 'it';
  const title = (it ? 'PANNELLO DI RILEVAMENTO AI' : 'AI DETECTION PANEL') + (label ? `  -  ${label}` : '');
  const out = ['', title, '='.repeat(Math.max(title.length, 62))];
  for (const name of DETECT_CHECKS) {
    const c = r.checks[name];
    out.push(`  ${name.padEnd(13)} ${bar(c.score)} ${f1(c.score)}`, `  ${''.padEnd(13)} ${c.detail}`);
  }
  out.push('-'.repeat(62), `  ${'HUMAN SCORE'.padEnd(13)} ${bar(r.humanScore)} ${f1(r.humanScore)}   ${r.verdict}`);
  if (r.verdict !== 'PASS') {
    out.push('', it ? `  Segnale più debole: ${r.weakest}. Parti da lì.` : `  Weakest signal: ${r.weakest}. Fix that first.`);
  }
  out.push('');
  return out;
}

export function formatDetectReport(r: DetectResult | DetectComparison): string {
  if (!('before' in r)) return renderPanel(r).join('\n');
  const it = r.before.lang === 'it';
  const lines = [
    ...renderPanel(r.before, it ? 'prima' : 'before'),
    ...renderPanel(r.after, it ? 'dopo' : 'after'),
  ];
  const sign = r.delta >= 0 ? '+' : '';
  lines.push(
    `  ${r.before.humanScore.toFixed(1)} ${r.before.verdict}  ->  ${r.after.humanScore.toFixed(1)} ${r.after.verdict}   (${sign}${r.delta.toFixed(1)})`,
    '',
  );
  return lines.join('\n');
}
