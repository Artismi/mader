// Utility linguistiche condivise da hookscore.ts e beats.ts: regex "alla Python",
// rilevamento lingua IT/EN, tokenizzazione e stima sillabe per l'italiano.
// Funzioni pure, nessun accesso a fs/process.

export type Lang = 'it' | 'en';
export type LangOption = Lang | 'auto';

// Classe "parola" Unicode, equivalente a \w di `re` in Python 3.
const W = String.raw`[\p{L}\p{N}_]`;
const B = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`;

/**
 * Compila una regex scritta in sintassi Python (`re`) come RegExp JS con flag `u`.
 * \b e \w diventano Unicode-aware come in Python 3 (in JS sarebbero solo ASCII),
 * e gli escape di virgolette (\" \') vengono tolti perché vietati in modalità `u`.
 */
export function rx(src: string, flags = ''): RegExp {
  let out = '';
  let inClass = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\' && i + 1 < src.length) {
      const n = src[++i];
      if (n === 'b' && !inClass) out += B;
      else if (n === 'w') out += inClass ? String.raw`\p{L}\p{N}_` : W;
      else if (n === '"' || n === "'") out += n;
      else out += '\\' + n;
      continue;
    }
    if (c === '[' && !inClass) inClass = true;
    else if (c === ']' && inClass) inClass = false;
    out += c;
  }
  return new RegExp(out, flags.includes('u') ? flags : flags + 'u');
}

/** Tutte le occorrenze (equivalente di re.findall senza gruppi). */
export function findAll(re: RegExp, text: string): string[] {
  const g = re.global ? re : new RegExp(re.source, re.flags + 'g');
  return Array.from(text.matchAll(g), (m) => m[0]);
}

/** Lunghezza in code point, come len() in Python (le emoji contano 1). */
export const charLen = (s: string): number => Array.from(s).length;

/**
 * Arrotondamento come Python (round / format .Nf): sui pareggi esatti in binario
 * (es. 81.25) arrotonda al pari, dove toFixed di JS arrotonda per eccesso.
 */
export function pyRound(x: number, d = 0): number {
  const f = 10 ** d;
  const s = x * f;
  if (Number.isInteger(s * 2) && !Number.isInteger(s)) {
    const lo = Math.floor(s);
    return (lo % 2 === 0 ? lo : lo + 1) / f;
  }
  return Number(x.toFixed(d));
}
export const fmt = (x: number, d = 1): string => pyRound(x, d).toFixed(d);

// ── Rilevamento lingua ──────────────────────────────────────────────────────
// Euristica a stopword: conta parole funzionali tipiche di ciascuna lingua.
// Le parole ambigue (a, i, in, no, me) sono escluse da entrambe le liste.
// A parità vince l'inglese, cioè il comportamento dello strumento originale.

const IT_MARKERS = new Set([
  'il', 'lo', 'la', 'gli', 'le', 'di', 'da', 'del', 'della', 'dei', 'delle', 'nel', 'nella', 'al', 'alla',
  'che', 'non', 'per', 'con', 'è', 'e', 'ed', 'ho', 'hai', 'ha', 'abbiamo', 'mi', 'ti', 'ci', 'si', 'sono',
  'sei', 'questo', 'questa', 'questi', 'come', 'ma', 'più', 'perché', 'cosa', 'tu', 'io', 'tuo', 'tua',
  'tuoi', 'mio', 'mia', 'miei', 'un', 'una', 'uno', 'anche', 'se', 'quando', 'ecco', 'tutto', 'solo',
  'nessuno', 'mai', 'oggi', 'ciao', 'ragazzi', 'fermati', 'smettila', 'smetti', 'ruba', 'guarda', 'vi',
  'voi', 'ogni', 'ancora', 'già', 'quello', 'quella', 'dove', 'chi', 'perso', 'fare', 'fatto', 'volte',
]);
const EN_MARKERS = new Set([
  'the', 'and', 'of', 'to', 'is', 'you', 'your', "you're", 'my', 'that', 'this', 'for', 'with', 'on',
  'it', "it's", 'was', 'were', 'are', 'how', 'what', 'why', 'if', 'do', "don't", 'not', 'have', 'be',
  'but', 'just', 'when', 'from', 'they', 'we', "i'm", 'will', 'can', 'guys', 'first', 'stop', 'never',
  'steal', 'watch', 'nobody', 'here', 'there', 'lost', 'one', 'every', 'than', 'used', 'take', 'takes',
]);

/** Rileva la lingua di un testo breve (hook o copione). */
export function detectLang(text: string): Lang {
  const toks = (text.toLowerCase().match(/[\p{L}'’]+/gu) ?? []).map((t) => t.replace(/’/g, "'"));
  let it = 0;
  let en = 0;
  for (const raw of toks) {
    const t = raw.replace(/^'+|'+$/g, '');
    if (IT_MARKERS.has(t)) it++;
    if (EN_MARKERS.has(t)) en++;
    // Elisioni italiane (l'errore, dell'anno, c'è) e lettere accentate.
    if (/^(?:l|dell|nell|all|dall|sull|un|c|d|quest|nessun)'\p{L}/u.test(t)) it++;
    if (/[àèéìíòóù]/u.test(t)) it++;
  }
  if (/€|\d\.\d{3}(?!\d)/u.test(text)) it++;
  return it > en ? 'it' : 'en';
}

export const resolveLang = (text: string, opt?: LangOption): Lang =>
  opt === 'it' || opt === 'en' ? opt : detectLang(text);

// ── Tokenizzazione ──────────────────────────────────────────────────────────

const WORD_RE_EN = /[A-Za-z0-9$%'’-]+/g;
const WORD_RE_IT = /[\p{L}\p{N}$€%'’-]+/gu;

/**
 * Parole "parlate". EN: identico all'originale ("$18,000" è una parola).
 * IT: toglie anche il punto delle migliaia ("18.000") e la virgola decimale ("1,5"),
 * e accetta lettere accentate ed €.
 */
export function words(text: string, lang: Lang): string[] {
  if (lang === 'en') return text.replace(/(?<=\d),(?=\d)/g, '').match(WORD_RE_EN) ?? [];
  const clean = text.replace(/(?<=\d)\.(?=\d{3}(?!\d))/g, '').replace(/(?<=\d),(?=\d)/g, '');
  return clean.match(WORD_RE_IT) ?? [];
}

/** Minuscolo senza apostrofi ai bordi, come w.lower().strip("'’") in Python. */
export const normTok = (w: string): string => w.toLowerCase().replace(/^['’]+|['’]+$/g, '');

/** Per l'italiano: la parola dopo l'elisione ("l'errore" → "errore"). */
export const elided = (w: string): string => {
  const t = normTok(w);
  const i = Math.max(t.lastIndexOf("'"), t.lastIndexOf('’'));
  return i >= 0 ? t.slice(i + 1) : t;
};

// ── Numeri e sillabe in italiano ────────────────────────────────────────────

const UNITS = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci',
  'undici', 'dodici', 'tredici', 'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
const TENS = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let s = h === 0 ? '' : h === 1 ? 'cento' : UNITS[h] + 'cento';
  if (r === 0) return s;
  if (r < 20) return s + UNITS[r];
  const t = TENS[Math.floor(r / 10)];
  const u = r % 10;
  s += u === 1 || u === 8 ? t.slice(0, -1) : t;
  return s + (u ? UNITS[u] : '');
}

/** Numero intero in lettere, in italiano ("18000" → "diciottomila"). Fino ai miliardi. */
export function numberToItalian(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const bil = Math.floor(n / 1e9);
  const mil = Math.floor((n % 1e9) / 1e6);
  const th = Math.floor((n % 1e6) / 1e3);
  const rest = n % 1e3;
  if (bil) parts.push(bil === 1 ? 'un miliardo' : below1000(bil) + ' miliardi');
  if (mil) parts.push(mil === 1 ? 'un milione' : below1000(mil) + ' milioni');
  if (th) parts.push(th === 1 ? 'mille' : below1000(th) + 'mila');
  if (rest) parts.push(below1000(rest));
  return parts.join(' ');
}

const STRONG = new Set(['a', 'e', 'o', 'à', 'è', 'é', 'ò', 'ó']);

/** Sillabe di una parola alfabetica: gruppi vocalici, con iato tra due vocali forti. */
function vowelSyllables(w: string): number {
  const groups = w.match(/[aeiouyàèéìíîòóùú]+/g);
  if (!groups) return w ? 1 : 0; // sigle senza vocali ("dm", "k") contano una sillaba
  let n = 0;
  for (const g of groups) {
    n++;
    // "paese", "poeta" → iato. Doppie uguali ("reel", "feed": prestiti inglesi) no.
    for (let i = 1; i < g.length; i++) if (STRONG.has(g[i - 1]) && STRONG.has(g[i]) && g[i - 1] !== g[i]) n++;
  }
  return n;
}

/**
 * Stima delle sillabe di un token italiano, già passato da words().
 * Le cifre vengono lette per esteso ("2026" → duemilaventisei = 6), i simboli
 * pronunciati (€ = "euro", $ = "dollari", % = "per cento"), "18k" = diciottomila.
 */
export function syllablesIt(token: string): number {
  let t = token.toLowerCase().replace(/['’-]/g, ' ');
  let n = 0;
  n += (t.match(/€/g)?.length ?? 0) * 2;
  n += (t.match(/\$/g)?.length ?? 0) * 3;
  n += (t.match(/%/g)?.length ?? 0) * 3;
  t = t.replace(/[€$%]/g, ' ');
  t = t.replace(/\d+(?:k\b)?/g, (m) => {
    const v = parseInt(m, 10) * (m.endsWith('k') ? 1000 : 1);
    return ' ' + numberToItalian(v) + ' ';
  });
  for (const w of t.split(/[^\p{L}]+/u)) if (w) n += vowelSyllables(w);
  return Math.max(1, n);
}
