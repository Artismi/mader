// Toglie l'impronta della macchina da una bozza. Port di humanize.py (ig-human, MIT, Jake Schincariol)
// con estensioni per l'italiano (lessico IT, segnali strutturali IT, elisioni, maiuscole accentate).
// Funzioni pure, nessun accesso a fs/process: utilizzabile lato server.
//
// Tre passaggi, in quest'ordine:
//   1. INVISIBILI   cancella o normalizza i caratteri che una tastiera non produce.
//   2. TIPOGRAFIA   lineetta → virgola, trattino medio → trattino, virgolette curve → dritte, … → ...
//   3. LESSICO      sostituisce lo slop di data/slop.ts con parole semplici (URL intatti).
// I segnali strutturali vengono SEGNALATI, mai riscritti: cambiare la forma di una frase
// richiede giudizio.

import { SLOP, type Lexicon, type LexEntry, type SlopLang, type StructureEntry } from './data/slop';

export type HumanizeLang = SlopLang | 'auto';

export interface HumanizeOptions {
  /** 'en' = comportamento identico all'originale; 'it' = lessico e regole italiane; 'auto' (default) = rileva. */
  lang?: HumanizeLang;
  /** Se true, il risultato include anche `report` già formattato. */
  report?: boolean;
  /** Lessico alternativo (default: SLOP). */
  lexicon?: Lexicon;
}

export type HumanizeChange =
  | { pass: 'invisible'; name: string; count: number; action: 'delete' | 'space' }
  | { pass: 'typographic'; name: string; count: number; to: string }
  | { pass: 'lexical'; find: string; replace: string; count: number; family: string };

export interface HumanizeFlag {
  id: string;
  name: string;
  count: number;
  fix: string;
}

export interface HumanizeResult {
  /** Testo pulito, senza spazi iniziali/finali (l'originale aggiunge un "\n" finale). */
  text: string;
  lang: SlopLang;
  changes: HumanizeChange[];
  /** Segnali strutturali da riscrivere a mano. */
  flags: HumanizeFlag[];
  report?: string;
}

// ---------------------------------------------------------------------------
// Utilità condivise con detect.ts

/** Classe "\w" di Python 3 (Unicode): lettere, cifre, underscore. */
const W = '\\p{L}\\p{N}_';
/** "\b" Unicode di Python: in JS "\b" è solo ASCII e romperebbe è, à, perché. */
export const WB = `(?:(?<=[${W}])(?![${W}])|(?<![${W}])(?=[${W}]))`;
const NWB = `(?:(?<=[${W}])(?=[${W}])|(?<![${W}])(?![${W}]))`;
const SYNTAX = new Set('^$\\.*+?()[]{}|/');
const PASSTHROUGH = new Set('dDsSntrfv0123456789xupPk');

/**
 * Converte una regex in sintassi Python re in RegExp JS (flag `u` sempre attivo):
 * flag inline iniziali, \b \B \w \W Unicode, \UXXXXXXXX, (?P<nome>), escape d'identità.
 */
export function pyRegex(src: string, extraFlags = ''): RegExp {
  const flags = new Set(extraFlags.split('').filter(Boolean));
  flags.add('u');
  const lead = /^\(\?([aiLmsux]+)\)/.exec(src);
  if (lead) {
    for (const f of lead[1]) {
      if (f === 'i' || f === 'm' || f === 's') flags.add(f);
      else if (f === 'x') throw new Error('flag (?x) non supportato');
    }
    src = src.slice(lead[0].length);
  }
  let out = '';
  let inClass = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      const n = src[++i];
      if (n === undefined) throw new Error('escape finale');
      if (n === 'b') out += inClass ? '\\x08' : WB;
      else if (n === 'B' && !inClass) out += NWB;
      else if (n === 'w') out += inClass ? W : `[${W}]`;
      else if (n === 'W' && !inClass) out += `[^${W}]`;
      else if (n === 'U') {
        out += `\\u{${src.slice(i + 1, i + 9)}}`;
        i += 8;
      } else if (PASSTHROUGH.has(n) || SYNTAX.has(n) || (inClass && n === '-')) out += '\\' + n;
      else out += n; // escape d'identità valido in Python ma non in JS con flag u (\  \' \# \-)
      continue;
    }
    if (inClass) {
      if (c === ']') inClass = false;
      out += c;
      continue;
    }
    if (c === '[') {
      inClass = true;
      out += c;
      if (src[i + 1] === '^') out += src[++i];
      if (src[i + 1] === ']') {
        out += '\\]'; // in Python "]" subito dopo "[" è letterale
        i++;
      }
      continue;
    }
    if (c === '(' && src.startsWith('(?P<', i)) {
      out += '(?<';
      i += 3;
      continue;
    }
    if (c === '(' && src.startsWith('(?P=', i)) {
      const end = src.indexOf(')', i);
      out += `\\k<${src.slice(i + 4, end)}>`;
      i = end;
      continue;
    }
    out += c;
  }
  return new RegExp(out, [...flags].join(''));
}

/** Conta le corrispondenze (non sovrapposte, come re.findall). */
export function countMatches(re: RegExp, text: string): number {
  const g = re.global ? re : new RegExp(re.source, re.flags + 'g');
  g.lastIndex = 0;
  return [...text.matchAll(g)].length;
}

/** str.split() di Python: spezza su spazi, scarta i vuoti. */
export function pySplit(s: string): string[] {
  return s.split(/\s+/).filter(Boolean);
}

const IT_HINTS = new Set(
  ('il lo la gli le di del della dei delle nel nella che è non per una un sono con questo questa ' +
    'come anche più perché ma ho hai mi ti ci si se poi cosa tutto quando sei siamo oggi tuo tua mio mia').split(' '),
);
const EN_HINTS = new Set(
  ('the and is of to you your it that this with for are was i my me we our what not but have be ' +
    'they just from about how when do does can will if so').split(' '),
);

/** Rilevamento lingua a parole-spia: 'it' solo se le spie italiane superano quelle inglesi. */
export function detectLang(text: string): SlopLang {
  let it = 0;
  let en = 0;
  for (const w of text.toLowerCase().match(/[\p{L}']+/gu) ?? []) {
    const bare = w.replace(/^'+|'+$/g, '');
    if (IT_HINTS.has(bare)) it++;
    if (EN_HINTS.has(bare)) en++;
    if (/^(?:l|dell|nell|all|dall|sull|un|c|d)'\p{L}/u.test(w)) it++; // elisione italiana
  }
  return it > en ? 'it' : 'en';
}

export function resolveLang(text: string, lang: HumanizeLang | undefined): SlopLang {
  return !lang || lang === 'auto' ? detectLang(text) : lang;
}

const isWordChar = (ch: string | undefined) => !!ch && /[\p{L}\p{N}_]/u.test(ch);
const escapeLiteral = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const entryCache = new WeakMap<LexEntry, RegExp>();

/**
 * Regex di una voce del lessico: \b + testo + \b, spazi elastici, case-insensitive.
 * Voci 'it': il confine si applica solo dove il bordo è una lettera, così "Spoiler:"
 * e "cosa ne pensi?" corrispondono (in Python \b dopo ":" o "?" non scatta mai).
 */
export function entryRegex(entry: LexEntry): RegExp {
  const hit = entryCache.get(entry);
  if (hit) return hit;
  const chars = [...entry.find];
  const smart = entry.lang === 'it';
  const pre = !smart || isWordChar(chars[0]) ? WB : '';
  const post = !smart || isWordChar(chars[chars.length - 1]) ? WB : '';
  const re = new RegExp(pre + escapeLiteral(entry.find).replace(/ /g, '\\s+') + post, 'giu');
  entryCache.set(entry, re);
  return re;
}

export function lexEntries(lex: Lexicon, lang: SlopLang, order: 'words-first' | 'phrases-first'): LexEntry[] {
  const all = order === 'words-first' ? [...lex.words, ...lex.phrases] : [...lex.phrases, ...lex.words];
  return all.filter((e) => (e.lang ?? 'en') === lang);
}

export function structuresFor(lex: Lexicon, lang: SlopLang): StructureEntry[] {
  return lex.structures.filter((s) => (s.lang ?? 'en') === lang);
}

const structCache = new WeakMap<StructureEntry, RegExp | null>();

/** Regex di un segnale strutturale (sempre MULTILINE come l'originale); null se non compila. */
export function structureRegex(s: StructureEntry): RegExp | null {
  if (structCache.has(s)) return structCache.get(s) ?? null;
  let re: RegExp | null;
  try {
    re = pyRegex(s.regex, 'gm');
  } catch {
    re = null;
  }
  structCache.set(s, re);
  return re;
}

/** ZWJ dentro una sequenza emoji (donna + ZWJ + laptop, bandiera arcobaleno): è legittimo, non va tolto. */
const EMOJI_ZWJ = /(?<=\p{Extended_Pictographic}[\u{FE0F}\u{1F3FB}-\u{1F3FF}]?)\u200D(?=\p{Extended_Pictographic})/gu;
const STRAY_ZWJ = /(?<!\p{Extended_Pictographic}[\u{FE0F}\u{1F3FB}-\u{1F3FF}]?)\u200D|\u200D(?!\p{Extended_Pictographic})/gu;

/** Caratteri di formato (Cf) esclusi gli ZWJ delle emoji composte. */
export function countFormatChars(text: string): number {
  return countMatches(/\p{Cf}/gu, text) - countMatches(EMOJI_ZWJ, text);
}

export const SENT_RE = /[^.!?\n]+[.!?]*/g;

// ---------------------------------------------------------------------------
// Passaggi

const URL_RE = /https?:\/\/\S+|www\.\S+|\S+@\S+\.\S+/g;

function protectUrls(text: string): { text: string; urls: string[] } {
  const urls: string[] = [];
  const out = text.replace(URL_RE, (m) => {
    urls.push(m);
    return `\x00URL${urls.length - 1}\x00`;
  });
  return { text: out, urls };
}

function restoreUrls(text: string, urls: string[]): string {
  urls.forEach((u, i) => {
    text = text.split(`\x00URL${i}\x00`).join(u);
  });
  return text;
}

function parseCp(spec: string): [number, number] | number {
  if (spec.includes('-')) {
    const [a, b] = spec.split('-');
    return [parseInt(a.slice(2), 16), parseInt(b.slice(2), 16)];
  }
  return parseInt(spec.slice(2), 16);
}

const hex = (n: number) => n.toString(16);

function passInvisible(text: string, lex: Lexicon): { text: string; hits: HumanizeChange[] } {
  const hits: HumanizeChange[] = [];
  for (const entry of lex.invisible) {
    const cp = parseCp(entry.cp);
    const re = Array.isArray(cp)
      ? new RegExp(`[\\u{${hex(cp[0])}}-\\u{${hex(cp[1])}}]`, 'gu')
      : cp === 0x200d
        ? STRAY_ZWJ
        : new RegExp(`\\u{${hex(cp)}}`, 'gu');
    const n = countMatches(re, text);
    if (n) {
      hits.push({ pass: 'invisible', name: `${entry.cp} ${entry.name}`, count: n, action: entry.action });
      text = text.replace(re, entry.action === 'delete' ? '' : ' ');
    }
  }
  // Ogni altro carattere Cf è invisibile per definizione (gli ZWJ delle emoji restano).
  text = text.replace(EMOJI_ZWJ, '\x00ZWJ\x00');
  const stray = countMatches(/\p{Cf}/gu, text);
  if (stray) {
    hits.push({ pass: 'invisible', name: 'other invisible format chars', count: stray, action: 'delete' });
    text = text.replace(/\p{Cf}/gu, '');
  }
  return { text: text.split('\x00ZWJ\x00').join('\u200D'), hits };
}

function passTypographic(text: string, lex: Lexicon): { text: string; hits: HumanizeChange[] } {
  const hits: HumanizeChange[] = [];
  for (const entry of lex.typographic) {
    const ch = entry.from;
    const n = text.split(ch).length - 1;
    if (!n) continue;
    hits.push({ pass: 'typographic', name: `${ch} ${entry.name}`, count: n, to: entry.to.trim() || '(space)' });
    if (ch === '—') {
      // " parola — parola " e "parola—parola" diventano virgola + spazio.
      text = text.replace(/\s*—\s*/g, ', ');
    } else if (ch === '–') {
      text = text.replace(/\s*–\s*(?=\d)/g, '-'); // 5–10 → 5-10
      text = text.replace(/\s+–\s+/g, ', '); // usato come inciso
      text = text.split('–').join('-');
    } else {
      // ’ → ' lascia intatte le elisioni (l’idea → l'idea, dell’anno → dell'anno).
      // « » non sono nel lessico: in italiano sono legittime e restano.
      text = text.split(ch).join(entry.to);
    }
  }
  // Una virgola inserita prima di altra punteggiatura suona male.
  text = text.replace(/,\s*([,.;:!?])/g, '$1');
  text = text.replace(/,\s*\n/g, '\n');
  return { text, hits };
}

const isUpperStr = (s: string) => s !== s.toLowerCase() && s === s.toUpperCase();

function matchCase(src: string, repl: string): string {
  if (!repl) return repl;
  const sc = [...src];
  if (isUpperStr(src) && sc.length > 1) return repl.toUpperCase();
  if (isUpperStr(sc[0])) {
    const rc = [...repl];
    return rc[0].toUpperCase() + rc.slice(1).join('');
  }
  return repl;
}

/** Articoli e preposizioni elise: "l'hack" → "l'trucco" sarebbe un errore. */
const ELIDED_BEFORE = /(?:^|[^\p{L}])(?:l|un|dell|nell|all|dall|sull|coll|pell|quell|quest|bell|sant|d)'$/iu;
const STARTS_VOWEL = /^[aeiouhàèéìòù]/iu;

function passLexical(
  text: string,
  lex: Lexicon,
  lang: SlopLang,
): { text: string; hits: HumanizeChange[]; skipped: number } {
  const hits: HumanizeChange[] = [];
  let skipped = 0;
  // Prima le più lunghe, così le frasi battono le singole parole (sort stabile come Python).
  const entries = lexEntries(lex, lang, 'phrases-first').sort((a, b) => [...b.find].length - [...a.find].length);
  for (const entry of entries) {
    const re = entryRegex(entry);
    const found = countMatches(re, text);
    if (!found) continue;
    let applied = 0;
    text = text.replace(re, (m: string, offset: number, whole: string) => {
      if (lang === 'it' && ELIDED_BEFORE.test(whole.slice(Math.max(0, offset - 8), offset))) {
        if (!entry.replace || !STARTS_VOWEL.test(entry.replace)) {
          skipped++;
          return m;
        }
      }
      applied++;
      return matchCase(m, entry.replace);
    });
    if (applied) {
      hits.push({ pass: 'lexical', find: entry.find, replace: entry.replace || '(deleted)', count: applied, family: entry.family });
    }
  }
  // Pulizia dopo le cancellazioni: punteggiatura orfana ("sistema. ." o riga che apre con virgola).
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/^[ \t]*(?:[,.;:]+[ \t]*)+/gm, '');
  text = text.replace(/^[ \t](?=\S)/gm, ''); // uno spazio lasciato da una cancellazione; rientri più profondi sono voluti
  text = text.replace(/\s+([,.;:!?])/g, '$1');
  text = text.replace(/,\s*([,.;:!?])/g, '$1'); // lineetta diventata virgola, poi la frase dopo è sparita
  text = text.split('...').join('\x00ELL\x00'); // protegge i veri puntini di sospensione
  text = text.replace(/\.\s*\.+/g, '.');
  text = text.replace(/([!?])\s*\./g, '$1');
  if (lang === 'it') {
    // Estensione IT: resti di congiunzione dopo una cancellazione
    // ("creare., e!" → "creare!", "fermarsi, e, nessuno" → "fermarsi, e nessuno").
    text = text.replace(/([.!?])[ \t]*,[ \t]*/g, '$1 ');
    text = text.replace(/(?:,[ \t]*|[ \t]+)(?:e|ed|o|ma)[ \t]*([.!?])/gu, '$1');
    text = text.replace(/\.[ \t]*([!?])/g, '$1');
    text = text.replace(/,[ \t]*(e|ed|o|ma)[ \t]*,[ \t]*/giu, ', $1 ');
  }
  text = text.split('\x00ELL\x00').join('...');
  text = text.replace(/^[ \t]+$/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  // Lineetta diventata virgola + connettivo = frase spezzata male: promuovila a punto.
  const splice =
    lang === 'it'
      ? /,\s*(poi|quindi|comunque|insomma|alla fine|in pratica)\s*,\s*/g
      : /,\s*(also|so|still|basically|in the end)\s*,\s*/g;
  text = text.replace(splice, (_m: string, w: string) => '. ' + w[0].toUpperCase() + w.slice(1) + ', ');
  return { text, hits, skipped };
}

export function scanStructures(text: string, lex: Lexicon, lang: SlopLang): HumanizeFlag[] {
  const flags: HumanizeFlag[] = [];
  for (const s of structuresFor(lex, lang)) {
    const re = structureRegex(s);
    if (!re) continue;
    const n = countMatches(re, text);
    if (n) flags.push({ id: s.id, name: s.name, count: n, fix: s.fix });
  }
  // Anche l'uniformità della lunghezza delle frasi è strutturale.
  const lens = (text.match(SENT_RE) ?? []).map((s) => pySplit(s).length).filter((n) => n > 2);
  if (lens.length >= 4) {
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const v = lens.reduce((a, n) => a + (n - mean) ** 2, 0) / lens.length;
    const cv = mean ? Math.sqrt(v) / mean : 0;
    if (cv < 0.35) {
      flags.push(
        lang === 'it'
          ? {
              id: 'uniform-length',
              name: `Frasi di lunghezza uniforme (variazione ${cv.toFixed(2)})`,
              count: lens.length,
              fix: "Spezza una frase a metà. Lasciane correre un'altra. Le macchine scrivono uniforme.",
            }
          : {
              id: 'uniform-length',
              name: `Uniform sentence length (variation ${cv.toFixed(2)})`,
              count: lens.length,
              fix: 'Break one sentence in half. Let another run long. Machines write even.',
            },
      );
    }
  }
  return flags;
}

/**
 * Cancellare un'apertura lascia minuscola la parola dopo. Si corregge solo per chi scrive
 * con le maiuscole: una voce tutta minuscola è uno stile, non un artefatto.
 */
function restoreCapitals(original: string, text: string, lang: SlopLang): string {
  const it = lang === 'it';
  const startsRe = it ? /(?:^|[.!?]\s+|\n)\s*(\p{L})/gu : /(?:^|[.!?]\s+|\n)\s*([A-Za-z])/g;
  const starts = [...original.matchAll(startsRe)].map((m) => m[1]);
  if (!starts.length || starts.filter((c) => isUpperStr(c)).length * 2 < starts.length) return text;
  const fixRe = it
    ? /(?:^|(?<=[.!?] )|(?<=[.!?]\n)|(?<=\n))\s*(\p{Ll})/gu
    : /(?:^|(?<=[.!?] )|(?<=[.!?]\n)|(?<=\n))\s*([a-z])/g;
  return text.replace(fixRe, (m: string, c: string) => m.slice(0, -c.length) + c.toUpperCase());
}

// ---------------------------------------------------------------------------
// API

export function humanize(input: string, opts: HumanizeOptions = {}): HumanizeResult {
  const lex = opts.lexicon ?? SLOP;
  const lang = resolveLang(input, opts.lang);
  const p = protectUrls(input);
  const inv = passInvisible(p.text, lex);
  const typo = passTypographic(inv.text, lex);
  const lexi = passLexical(typo.text, lex, lang);
  let text = restoreCapitals(input, lexi.text, lang);
  text = restoreUrls(text, p.urls);
  const flags = scanStructures(text, lex, lang);
  if (lexi.skipped) {
    flags.push({
      id: 'elision-kept',
      name: 'Sostituzione saltata dopo elisione',
      count: lexi.skipped,
      fix: "Una parola dello slop segue un articolo eliso (l', un', dell'...). Riscrivi a mano articolo e parola.",
    });
  }
  const result: HumanizeResult = {
    text: text.trim(),
    lang,
    changes: [...inv.hits, ...typo.hits, ...lexi.hits],
    flags,
  };
  if (opts.report) result.report = formatHumanizeReport(result);
  return result;
}

export function formatHumanizeReport(result: HumanizeResult): string {
  const it = result.lang === 'it';
  const lines: string[] = [];
  const head = (title: string) => lines.push('', title, '-'.repeat(title.length));
  const pad = (n: number) => String(n).padStart(3);
  const by = <P extends HumanizeChange['pass']>(p: P) =>
    result.changes.filter((c): c is Extract<HumanizeChange, { pass: P }> => c.pass === p);
  const total = result.changes.reduce((a, c) => a + c.count, 0);

  head(it ? 'REPORT HUMANIZE' : 'HUMANIZE REPORT');
  lines.push(
    it
      ? `${total} artefatti della macchina rimossi, ${result.flags.length} segnali strutturali da riscrivere`
      : `${total} machine artefacts removed, ${result.flags.length} structural tells flagged for rewrite`,
  );
  const inv = by('invisible');
  if (inv.length) {
    head(it ? '1. CARATTERI INVISIBILI' : '1. INVISIBLE CHARACTERS');
    for (const h of inv) lines.push(`  ${pad(h.count)}x  ${h.name}  -> ${h.action}`);
  }
  const typo = by('typographic');
  if (typo.length) {
    head(it ? '2. TIPOGRAFIA' : '2. TYPOGRAPHY');
    for (const h of typo) lines.push(`  ${pad(h.count)}x  ${h.name}  -> ${h.to}`);
  }
  const lexi = by('lexical');
  if (lexi.length) {
    head(it ? '3. LESSICO SLOP' : '3. SLOP LEXICON');
    for (const h of lexi) lines.push(`  ${pad(h.count)}x  ${h.find}  -> ${h.replace}   [${h.family}]`);
  }
  if (result.flags.length) {
    head(
      it
        ? '4. SEGNALI STRUTTURALI  (non corretti in automatico, riscrivili tu)'
        : '4. STRUCTURAL TELLS  (not auto-fixed - rewrite these yourself)',
    );
    for (const h of result.flags) lines.push(`  ${pad(h.count)}x  ${h.name}`, `        ${h.fix}`);
  }
  if (!result.changes.length && !result.flags.length) {
    head(it ? 'PULITO' : 'CLEAN');
    lines.push(it ? '  Niente da togliere.' : '  Nothing to strip.');
  }
  lines.push('');
  return lines.join('\n');
}
