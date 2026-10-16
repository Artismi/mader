// Trasforma il copione di un Reel in un beat sheet temporizzato, prima di registrarlo.
// Port di beats.py (ig-reel, MIT, Jake Schincariol) con stima delle durate per l'italiano.
// Segnala i quattro problemi che uccidono un Reel al montaggio: hook oltre i 3 secondi,
// un beat abbastanza lungo da far scappare chi guarda, una serie di righe senza niente di
// concreto, e un finale che non richiama la prima riga (niente loop). Più la durata vs target.
// Le durate sono una stima: bastano per pianificare il montaggio, non sostituiscono la registrazione.
// Funzioni pure, nessun accesso a fs/process.

import { elided, findAll, fmt, pyRound, resolveLang, rx, syllablesIt, words, type Lang, type LangOption } from './lang';

export interface BeatSheetOptions {
  /** Durata obiettivo in secondi. */
  targetSec?: number;
  /** Velocità di parlato. Default 165 (EN) / 150 (IT). Misurala leggendo un copione ad alta voce. */
  wpm?: number;
  lang?: LangOption;
}

export type BeatLabel = '' | 'HOOK' | 'MID' | 'CTA' | 'HOOK/CTA';

export interface Beat {
  n: number;
  /** Inizio in secondi (2 decimali). */
  start: number;
  /** Durata stimata in secondi (2 decimali). */
  dur: number;
  words: number;
  text: string;
  /** Numero di elementi concreti (cifre, prezzi, nomi; in IT anche numeri in lettere). */
  concrete: number;
  label: BeatLabel;
  flags: string[];
}

export type BeatNoteCode =
  | 'hook_long' | 'hook_abstract' | 'beat_long' | 'abstract_run'
  | 'loop' | 'no_loop' | 'target_ok' | 'target_over' | 'target_under';

export interface BeatNote {
  code: BeatNoteCode;
  level: 'warn' | 'ok';
  message: string;
}

export interface BeatSheet {
  lang: Lang;
  wpm: number;
  target: number | null;
  totalSeconds: number;
  totalWords: number;
  beats: Beat[];
  /** Tutte le note, nell'ordine dell'originale. */
  notes: BeatNote[];
  /** Solo i messaggi da sistemare (level 'warn'). */
  warnings: string[];
}

export const HOOK_WINDOW = 3.0; // secondi: oltre, il pollice ha già deciso
export const MAX_BEAT = 4.0; // secondi su un'idea senza cambi a schermo
export const ABSTRACT_RUN = 3; // beat di fila senza niente di verificabile

export const DEFAULT_WPM: Record<Lang, number> = { en: 165, it: 150 };

/**
 * Italiano: la durata si stima dalle sillabe, non dalle parole, perché le parole italiane sono
 * più lunghe e variano molto ("e" contro "professionalmente"). Ipotesi: una parola italiana media
 * in un copione parlato ha ~2,2 sillabe, quindi `wpm` parole al minuto equivalgono a
 * wpm/60 × 2,2 sillabe al secondo (150 wpm → 5,5 sill/s, ritmo chiaro da Reel; il parlato
 * spontaneo italiano arriva a 6-7 sill/s). Le cifre si contano lette per esteso
 * ("18.000 €" = diciottomila euro = 7 sillabe). In inglese resta parole / (wpm/60) come l'originale.
 */
export const IT_SYLLABLES_PER_WORD = 2.2;

const SENT_RE = { en: /[^.!?]+[.!?]*/g, it: /(?:[^.!?]|\.(?=\d))+[.!?]*/g };
const CONCRETE_RE = {
  en: rx(String.raw`\$\s?\d|\b\d[\d,.]*\b|(?<!^)\b[A-Z][a-z]{2,}\b`, 'gm'),
  it: rx(String.raw`[€$]\s?\d|\d\s?€|\b\d[\d,.]*\b|(?<!^)\b[A-ZÀ-Ý][a-zà-ÿ]{2,}\b`, 'gm'),
};
// In IT contano come concreti anche numeri e valute in lettere ("cinque ore", "mille euro").
const SPOKEN_CONCRETE_IT = rx(String.raw`\b(?:due|tre|quattro|cinque|sette|otto|nove|dieci|venti|trenta|quaranta|cinquanta|cento|mille|mila|milioni?|miliardi?|euro|dollari|\w+mila|\w+cento)\b`, 'gi');

const STOPWORDS: Record<Lang, Set<string>> = {
  en: new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'for', 'with', 'that', 'this',
    'it', 'is', 'are', 'was', 'were', 'be', 'been', 'you', 'your', 'i', 'my', 'me', 'we', 'our', 'they',
    'them', 'he', 'she', 'so', 'just', 'not', 'no', 'do', 'did', 'does', 'have', 'has', 'had', 'will',
    'can', 'at', 'as', 'by', 'from', 'out', 'up', 'off', 'one', 'all',
  ]),
  it: new Set([
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'e', 'ed', 'o', 'ma', 'se', 'di', 'a', 'da',
    'in', 'con', 'su', 'per', 'tra', 'fra', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo',
    'alla', 'ai', 'agli', 'alle', 'nel', 'nella', 'nei', 'sul', 'sulla', 'che', 'chi', 'questo', 'questa',
    'quello', 'quella', 'è', 'sono', 'era', 'ho', 'hai', 'ha', 'abbiamo', 'hanno', 'essere', 'avere',
    'tu', 'ti', 'te', 'tuo', 'tua', 'io', 'mi', 'me', 'mio', 'mia', 'noi', 'ci', 'voi', 'vi', 'loro',
    'lui', 'lei', 'si', 'ne', 'non', 'no', 'così', 'solo', 'poi', 'anche', 'già', 'più', 'come', 'tutto',
    'tutti', 'fa', 'fai', 'fare',
  ]),
};

// ── Helper ──────────────────────────────────────────────────────────────────

const round2 = (x: number): number => pyRound(x, 2);

/** Rimette il separatore delle migliaia per la visualizzazione. */
const pretty = (token: string, lang: Lang): string =>
  token.replace(/(\d)(?=(\d{3})+$)/g, lang === 'en' ? '$1,' : '$1.');

/** Timecode m:ss.s */
function tc(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${m}:${fmt(seconds - m * 60).padStart(4, '0')}`;
}

/** Stimatore di durata (secondi) per la lingua e la velocità date. */
function durationFn(lang: Lang, wpm: number): (text: string) => number {
  const wps = wpm / 60;
  if (lang === 'en') return (t) => words(t, 'en').length / wps;
  const sps = wps * IT_SYLLABLES_PER_WORD;
  return (t) => words(t, 'it').reduce((a, w) => a + syllablesIt(w), 0) / sps;
}

/** Una riga è un beat, a meno che non sia troppo lunga per esserlo. */
function splitBeats(raw: string, lang: Lang, dur: (t: string) => number): string[] {
  const beats: string[] = [];
  for (const line of raw.split(/\r?\n/).map((l) => l.trim())) {
    if (!line) continue;
    if (dur(line) <= MAX_BEAT * 1.5) { beats.push(line); continue; }
    // Paragrafo lungo: spezzalo a fine frase così le durate hanno senso.
    const parts = (line.match(SENT_RE[lang]) ?? []).map((p) => p.trim()).filter(Boolean);
    let buf = '';
    for (const part of parts) {
      const candidate = (buf + ' ' + part).trim();
      if (buf && dur(candidate) > MAX_BEAT) { beats.push(buf); buf = part; }
      else buf = candidate;
    }
    if (buf) beats.push(buf);
  }
  return beats;
}

function countConcrete(text: string, lang: Lang): number {
  const n = findAll(CONCRETE_RE[lang], text).length;
  return lang === 'en' ? n : n + findAll(SPOKEN_CONCRETE_IT, text).length;
}

const loopKey = (w: string, lang: Lang): string => (lang === 'en' ? w.toLowerCase() : elided(w));

// ── API ─────────────────────────────────────────────────────────────────────

/** Costruisce il beat sheet. Restituisce null se il copione è vuoto. */
export function buildBeatSheet(script: string, opts: BeatSheetOptions = {}): BeatSheet | null {
  const lang = resolveLang(script, opts.lang);
  const wpm = opts.wpm && opts.wpm > 0 ? opts.wpm : DEFAULT_WPM[lang];
  const target = opts.targetSec || null;
  const wps = wpm / 60;
  const dur = durationFn(lang, wpm);
  const texts = splitBeats(script, lang, dur);
  if (!texts.length) return null;

  const rows: Beat[] = [];
  let clock = 0;
  texts.forEach((text, i) => {
    const d = dur(text);
    rows.push({
      n: i + 1, start: round2(clock), dur: round2(d), words: words(text, lang).length, text,
      concrete: countConcrete(text, lang), label: '', flags: [],
    });
    clock += d;
  });
  const total = clock;

  // Etichette sulle posizioni strutturali attorno a cui si costruisce un Reel.
  for (const r of rows) if (r.n === 1 || r.start + r.dur <= HOOK_WINDOW) r.label = 'HOOK';
  const last = rows[rows.length - 1];
  last.label = last.label !== 'HOOK' ? 'CTA' : 'HOOK/CTA';
  const half = total / 2;
  for (const r of rows) if (!r.label && r.start <= half && half < r.start + r.dur) r.label = 'MID';

  const notes: BeatNote[] = [];
  const warn = (code: BeatNoteCode, message: string) => notes.push({ code, level: 'warn', message });
  const ok = (code: BeatNoteCode, message: string) => notes.push({ code, level: 'ok', message });
  const first = rows[0];

  if (first.dur > HOOK_WINDOW) {
    first.flags.push(`l'hook dura ${fmt(first.dur)}s, oltre i ${HOOK_WINDOW.toFixed(0)}s`);
    const maxWords = Math.floor(HOOK_WINDOW * wps);
    const limit = lang === 'en'
      ? `${maxWords} parole o meno`
      : `circa ${Math.floor(HOOK_WINDOW * wps * IT_SYLLABLES_PER_WORD)} sillabe (~${maxWords} parole)`;
    warn('hook_long', `Il beat 1 dura ${fmt(first.dur)}s. Taglialo a ${limit}, o l'hook arriva quando la decisione è già presa.`);
  }
  if (first.concrete === 0) {
    warn('hook_abstract', 'Il beat 1 non ha né un numero né un nome. Gli hook senza niente di verificabile sono quelli che vengono scrollati.');
  }

  for (const r of rows) if (r.dur > MAX_BEAT) r.flags.push(`${fmt(r.dur)}s su un solo beat`);
  const longBeats = rows.filter((r) => r.dur > MAX_BEAT).map((r) => r.n);
  if (longBeats.length) {
    warn('beat_long', `${longBeats.length > 1 ? 'I beat' : 'Il beat'} ${longBeats.join(', ')} ${longBeats.length > 1 ? 'superano' : 'supera'} i ${MAX_BEAT.toFixed(0)}s. Spezza la riga o cambia quello che c'è a schermo al suo interno. Un'inquadratura ferma è il punto in cui la gente se ne va.`);
  }

  let run = 0;
  let start: number | null = null;
  for (const r of rows) {
    if (r.concrete === 0) {
      run++;
      start = start ?? r.n;
      if (run === ABSTRACT_RUN) warn('abstract_run', `I beat ${start}-${r.n} non hanno niente di concreto. Metti un numero, un nome o un prezzo in uno di questi.`);
    } else { run = 0; start = null; }
  }

  // L'ultima riga riporta alla prima?
  const stop = STOPWORDS[lang];
  const keys = (t: string) => new Set(words(t, lang).map((w) => loopKey(w, lang)).filter((w) => /[\p{L}\p{N}]/u.test(w) && !stop.has(w)));
  const lastKeys = keys(last.text);
  const loop = Array.from(keys(first.text)).filter((w) => lastKeys.has(w)).map((w) => pretty(w, lang)).sort();
  if (loop.length) {
    ok('loop', `Loop: l'ultimo beat ripete «${loop.slice(0, 3).join(', ')}» dall'hook. Le seconde visualizzazioni sono reach gratis.`);
  } else {
    warn('no_loop', "Niente loop. L'ultimo beat non condivide nessuna parola con l'hook, quindi il video finisce piatto. Riprendere una parola del beat 1 è il replay più economico che c'è.");
  }

  if (target) {
    const delta = total - target;
    if (Math.abs(delta) <= target * 0.1) {
      ok('target_ok', `Durata in linea con il target (${fmt(total)}s su ${fmt(target)}s).`);
    } else if (delta > 0) {
      warn('target_over', `${fmt(delta)}s oltre il target. Taglia circa ${Math.floor(delta * wps)} parole.`);
    } else {
      warn('target_under', `${fmt(-delta)}s sotto il target. Aggiungi ${Math.floor(-delta * wps)} parole o giralo più corto. Di solito più corto è giusto.`);
    }
  }

  return {
    lang, wpm, target,
    totalSeconds: round2(total),
    totalWords: rows.reduce((a, r) => a + r.words, 0),
    beats: rows,
    notes,
    warnings: notes.filter((n) => n.level === 'warn').map((n) => n.message),
  };
}

/** Report testuale del beat sheet, come l'output di beats.py. */
export function formatBeatSheet(sheet: BeatSheet): string {
  const est = sheet.lang === 'it' ? ' (stima a sillabe)' : '';
  const head = `BEAT SHEET  ·  ${sheet.totalWords} parole  ·  ~${fmt(sheet.totalSeconds)}s a ${sheet.wpm} wpm${est}`
    + (sheet.target ? `  ·  target ${fmt(sheet.target)}s` : '');
  const width = Math.max(Array.from(head).length, 72);
  const L: string[] = ['', head, '='.repeat(width)];
  for (const r of sheet.beats) {
    const label = r.label ? r.label.padEnd(8) : ' '.repeat(8);
    L.push(`  ${tc(r.start)}  ${fmt(r.dur).padStart(4)}s  ${label}${r.text}`);
    for (const f of r.flags) L.push(`${' '.repeat(25)}^ ${f}`);
  }
  L.push('-'.repeat(width));
  for (const n of sheet.notes) L.push(`  - ${n.message}`);
  L.push('');
  return L.join('\n') + '\n';
}
