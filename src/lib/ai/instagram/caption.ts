// Linter per caption Instagram: mostra cosa vede il feed prima di "... altro"
// e controlla le cose che contano. Port di caption.py (ig-caption, MIT, Jake Schincariol)
// con estensioni per l'italiano (CTA, numeri in lettere, €).
// Funzioni pure, nessun accesso a fs/process: utilizzabile lato server.

/** Limite rigido di caratteri della caption su Instagram. */
export const CAPTION_LIMIT = 2200;
/** Circa dove il feed taglia con "... altro". È un'approssimazione: varia con device e font. */
export const CAPTION_TRUNCATE = 125;
/**
 * Massimo hashtag per post/reel: 5 dal 18 dicembre 2025 (prima 30), annunciato da @Creators.
 * ATTENZIONE: i numeri delle piattaforme invecchiano in fretta, ricontrollare periodicamente.
 */
export const HASHTAG_LIMIT = 5;

export type CaptionLang = 'it' | 'en' | 'auto';
export type CheckStatus = 'PASS' | 'WARN' | 'FAIL';
export type CaptionCheckId =
  | 'LENGTH'
  | 'FIRST_LINE'
  | 'HOOK_CONCRETE'
  | 'HASHTAGS'
  | 'TAG_PLACEMENT'
  | 'LINKS'
  | 'ONE_ASK'
  | 'EMOJI'
  | 'SEARCH_TERMS';

export interface CaptionCheck {
  id: CaptionCheckId;
  status: CheckStatus;
  label: string;
  detail: string;
}

export type CaptionVerdict = 'READY' | 'REVIEW' | 'FIX';

export interface CaptionLintOptions {
  keywords?: string[];
  /** 'en' = comportamento identico all'originale; 'it' = aggiunge regole italiane; 'auto' (default) = rileva. */
  lang?: CaptionLang;
  /** Caratteri visibili prima del taglio (default 125). */
  truncate?: number;
}

export interface CaptionLintResult {
  characters: number;
  limit: number;
  truncateAt: number;
  /** Testo visibile nel feed prima del taglio. */
  feedWindow: string;
  truncated: boolean;
  firstLineChars: number;
  hashtags: string[];
  mentions: string[];
  links: string[];
  emoji: number;
  asks: string[];
  /** Lingua effettivamente usata per le regole. */
  lang: 'it' | 'en';
  checks: CaptionCheck[];
  verdict: CaptionVerdict;
}

const LABELS: Record<CaptionCheckId, string> = {
  LENGTH: 'LUNGHEZZA',
  FIRST_LINE: 'PRIMA RIGA',
  HOOK_CONCRETE: 'HOOK CONCRETO',
  HASHTAGS: 'HASHTAG',
  TAG_PLACEMENT: 'POSIZIONE TAG',
  LINKS: 'LINK',
  ONE_ASK: 'UNA SOLA CTA',
  EMOJI: 'EMOJI',
  SEARCH_TERMS: 'PAROLE CHIAVE',
};

const VERDICT_LABELS: Record<CaptionVerdict, string> = {
  READY: 'PRONTA',
  REVIEW: 'DA RIVEDERE',
  FIX: 'DA CORREGGERE',
};

// Regex costruite con new RegExp: lookbehind e flag 'u' non passano il check di target ES2017 di tsc.
const HASHTAG_RE = new RegExp('(?:^|\\s)(#[\\p{L}\\p{N}_]+)', 'gu'); // originale: solo ASCII
const HASHTAG_RE_ASCII = /(?:^|\s)(#[A-Za-z0-9_]+)/g;
const MENTION_RE = /(?:^|\s)(@[A-Za-z0-9_.]+)/g;
const LINK_RE = /https?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:com|co|io|net|org|ai|app)\/\S*/gi;
const LINK_RE_IT = /https?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:com|co|io|net|org|ai|app|it|eu)\/\S*/gi;
const EMOJI_RE = new RegExp('[\\u{1F300}-\\u{1FAFF}\\u2600-\\u27BF\\u2190-\\u21FF\\uFE0F]', 'gu');
const CONCRETE_RE = new RegExp('\\$\\s?\\d|\\b\\d[\\d,.]*\\b|(?<!^)\\b[A-Z][a-z]{2,}\\b', 'gm');
// Italiano: maiuscole accentate (es. "Città"), € e numeri in lettere ("sei" e "uno" esclusi: ambigui).
const CONCRETE_RE_IT = new RegExp(
  '\\$\\s?\\d|\\b\\d[\\d,.]*\\b|(?<!^)(?<![\\p{L}\\p{N}_])[A-ZÀ-Ý][a-zà-ÿ]{2,}(?![\\p{L}\\p{N}_])',
  'gmu',
);
const CONCRETE_RE_IT_EXTRA =
  /€\s?\d|\d\s?€|\b(?:due|tre|quattro|cinque|sette|otto|nove|dieci|undici|dodici|quindici|venti|trenta|quaranta|cinquanta|cento|duecento|mille|mila|milioni?|miliardi?)\b/gi;

interface AskRule {
  name: string;
  en: RegExp;
  it?: RegExp;
}

// Stesse categorie dell'originale: una CTA conta una volta sola anche se citata in due lingue.
// Nota: come in caption.py, con (?i) "[A-Z0-9]{2,}" accetta anche minuscole ("comment below").
const ASKS: AskRule[] = [
  {
    name: 'commenta una parola chiave',
    en: /\bcomment (?:the word |")?[A-Z0-9]{2,}\b/i,
    it: /\bcommenta(?:te)?\b|\bscrivi(?:mi|temi)? (?:nei|qui sotto nei|sotto nei) commenti\b|\blascia(?:mi)? un commento\b/i,
  },
  {
    name: 'DM',
    en: /\b(?:dm|message) me\b/i,
    it: /\bscrivimi\b(?! (?:nei|qui sotto|sotto)\b)|\bmanda(?:mi|temi)? un (?:dm|messaggio|direct)\b|\bin dm\b|\bin direct\b/i,
  },
  { name: 'salva', en: /\bsave (?:this|it)\b/i, it: /\bsalva(?:lo|la|te|telo|tela|tevelo)?\b/i },
  { name: 'condividi', en: /\bshare (?:this|it)\b/i, it: /\bcondividi(?:lo|la|telo|tela)?\b|\bmanda(?:lo|la)? a chi\b/i },
  { name: 'segui', en: /\bfollow (?:me|for)\b/i, it: /\bseguimi\b|\bsegui(?:ci)? per\b/i },
  { name: 'link in bio', en: /\blink in (?:my )?bio\b/i, it: /\blink (?:in|nella) (?:mia )?bio\b/i },
  {
    name: 'scorri o tocca',
    en: /\b(?:swipe|tap) (?:through|left|right|for|to)\b/i,
    it: /\bscorri\b|\bfai swipe\b|\btocca (?:per|qui)\b/i,
  },
  {
    name: 'rispondi a una domanda',
    en: /\btell me\b|\bwhat would you\b|\bwhich one\b/i,
    it: /\bdimmi\b|\bditemi\b|\btu cosa (?:faresti|ne pensi|scegli)\b|\bche ne pensi\b|\bquale (?:scegli|preferisci|sceglieresti)\b/i,
  },
];

const FILLER_TAGS = new Set([
  '#viral', '#fyp', '#explore', '#explorepage', '#foryou', '#foryoupage',
  '#trending', '#instagood', '#love', '#follow', '#like4like', '#reels',
  '#reelsinstagram', '#viralreels', '#instadaily',
]);
const FILLER_TAGS_IT = new Set([
  '#virale', '#perte', '#neiperte', '#tendenza', '#tendenze', '#seguimi', '#italia',
  '#instaitalia', '#instagramitalia', '#reelsitalia', '#reelitalia', '#igersitalia', '#likeforlike',
]);

const IT_WORDS = /\b(?:il|lo|la|gli|le|di|che|non|per|una|sono|questo|questa|come|perché|anche|più|ho|hai|del|della|nel|nella|ma|cosa|tuo|tua)\b/gi;
const EN_WORDS = /\b(?:the|and|you|your|that|this|with|for|is|are|was|what|have|not|but|my|it's|of|to)\b/gi;

/** Lunghezza in code point, come len() di Python. */
const cpLen = (s: string): number => Array.from(s).length;
const cpSlice = (s: string, end: number): string => Array.from(s).slice(0, end).join('');
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const fmtNum = (n: number, digits = 1): string => n.toFixed(digits).replace('.', ',');

function groups(re: RegExp, text: string): string[] {
  return Array.from(text.matchAll(re), (m) => m[1]);
}
function matches(re: RegExp, text: string): string[] {
  return Array.from(text.matchAll(re), (m) => m[0]);
}

function detectLang(text: string): 'it' | 'en' {
  const it = (text.match(IT_WORDS) ?? []).length;
  const en = (text.match(EN_WORDS) ?? []).length;
  return it > en ? 'it' : 'en';
}

/** Cosa mostra il feed. Instagram taglia a metà parola, quindi anche qui. */
export function visibleWindow(text: string, cut: number = CAPTION_TRUNCATE): string {
  const flat = text.trim();
  return cpLen(flat) <= cut ? flat : cpSlice(flat, cut);
}

export function lintCaption(caption: string, opts: CaptionLintOptions = {}): CaptionLintResult {
  const cut = opts.truncate ?? CAPTION_TRUNCATE;
  const stripped = caption.trimEnd().trim();
  const lang: 'it' | 'en' = opts.lang && opts.lang !== 'auto' ? opts.lang : detectLang(stripped);
  const it = lang === 'it';

  const chars = cpLen(stripped);
  const firstLine = (stripped.split('\n')[0] ?? '').trim();
  const firstLen = cpLen(firstLine);
  const tags = groups(it ? HASHTAG_RE : HASHTAG_RE_ASCII, stripped);
  const mentions = groups(MENTION_RE, stripped);
  const links = matches(it ? LINK_RE_IT : LINK_RE, stripped);
  const emoji = matches(EMOJI_RE, stripped);
  const window = visibleWindow(stripped, cut);
  const truncated = chars > cut;
  const asks = ASKS.filter((a) => a.en.test(stripped) || (it && !!a.it && a.it.test(stripped))).map((a) => a.name);
  const filler = tags.filter((t) => FILLER_TAGS.has(t.toLowerCase()) || (it && FILLER_TAGS_IT.has(t.toLowerCase())));
  const keywords = (opts.keywords ?? []).map((k) => k.trim()).filter(Boolean);

  const checks: CaptionCheck[] = [];
  const add = (id: CaptionCheckId, status: CheckStatus, detail: string) =>
    checks.push({ id, status, label: LABELS[id], detail });

  add(
    'LENGTH',
    chars > CAPTION_LIMIT ? 'FAIL' : 'PASS',
    `${chars} / ${CAPTION_LIMIT} caratteri` + (chars > CAPTION_LIMIT ? `, ${chars - CAPTION_LIMIT} oltre il limite` : ''),
  );

  if (!firstLine) {
    add('FIRST_LINE', 'FAIL', 'la caption inizia con una riga vuota');
  } else if (firstLine.startsWith('#') || firstLine.startsWith('@')) {
    add('FIRST_LINE', 'FAIL', "inizia con un hashtag o una menzione, cioè l'unica posizione che vale una frase");
  } else if (firstLen > cut) {
    add(
      'FIRST_LINE',
      'WARN',
      `${firstLen} caratteri, quindi viene tagliata a ${cut} a metà pensiero. ` +
        'Va bene se il taglio è un cliffhanger, male se è una subordinata',
    );
  } else {
    add('FIRST_LINE', 'PASS', `${firstLen} caratteri, si legge per intero`);
  }

  const concrete = it
    ? matches(CONCRETE_RE_IT, window).length + matches(CONCRETE_RE_IT_EXTRA, window).length
    : matches(CONCRETE_RE, window).length;
  add(
    'HOOK_CONCRETE',
    concrete ? 'PASS' : 'WARN',
    `${concrete} numeri o nomi nella parte visibile` + (concrete ? '' : ': niente di verificabile prima del tap'),
  );

  if (tags.length > HASHTAG_LIMIT) {
    add(
      'HASHTAGS',
      'FAIL',
      `${tags.length} tag, oltre il limite Instagram di ${HASHTAG_LIMIT}. ` +
        'I tag oltre il quinto non contano e il blocco sembra vecchio',
    );
  } else if (tags.length === HASHTAG_LIMIT && filler.length) {
    add('HASHTAGS', 'WARN', `${tags.length} tag, al limite, e ${filler.length} generici. Usa i cinque per gli argomenti`);
  } else if (filler.length) {
    add('HASHTAGS', 'WARN', `${tags.length} tag, ${filler.length} generici (${filler.slice(0, 3).join(', ')}). Non descrivono nulla`);
  } else {
    add('HASHTAGS', 'PASS', `${tags.length} tag` + (tags.length ? `: ${tags.join(' ')}` : ''));
  }

  if (!tags.length) {
    add('TAG_PLACEMENT', 'PASS', 'nessun tag da posizionare');
  } else if (tags.some((t) => new RegExp('(?:^|\\s)' + escapeRe(t) + '\\b').test(window))) {
    add('TAG_PLACEMENT', 'WARN', "un hashtag è nella parte visibile e spreca spazio del feed per un'etichetta");
  } else {
    add('TAG_PLACEMENT', 'PASS', 'i tag sono sotto il taglio');
  }

  add(
    'LINKS',
    links.length ? 'WARN' : 'PASS',
    links.length
      ? `${links.length} link nella caption, ma le caption non sono cliccabili. Spostalo in bio o in DM`
      : 'nessun link morto nel testo',
  );

  if (asks.length === 1) add('ONE_ASK', 'PASS', `una sola call to action: ${asks[0]}`);
  else if (!asks.length) add('ONE_ASK', 'WARN', 'nessuna call to action. Decidi a cosa serve questo post');
  else add('ONE_ASK', 'WARN', `${asks.length} richieste (${asks.join(', ')}). Due richieste valgono come nessuna`);

  const density = (emoji.length * 100) / Math.max(chars, 1);
  add(
    'EMOJI',
    density > 4 ? 'WARN' : 'PASS',
    `${emoji.length} emoji, ${fmtNum(density)} ogni 100 caratteri` + (density > 4 ? ': sembra decorazione' : ''),
  );

  if (keywords.length) {
    const low = stripped.toLowerCase();
    const winLow = window.toLowerCase();
    const found = keywords.filter((k) => low.includes(k.toLowerCase()));
    const missing = keywords.filter((k) => !low.includes(k.toLowerCase()));
    const inWindow = found.filter((k) => winLow.includes(k.toLowerCase()));
    const status: CheckStatus = !missing.length ? 'PASS' : found.length ? 'WARN' : 'FAIL';
    add(
      'SEARCH_TERMS',
      status,
      `${found.length}/${keywords.length} presenti` +
        (found.length ? `, ${inWindow.length} nella parte visibile` : '') +
        (missing.length ? `. Mancano: ${missing.join(', ')}` : ''),
    );
  }

  const fails = checks.filter((c) => c.status === 'FAIL').length;
  const warns = checks.filter((c) => c.status === 'WARN').length;
  const verdict: CaptionVerdict = fails ? 'FIX' : warns ? 'REVIEW' : 'READY';

  return {
    characters: chars,
    limit: CAPTION_LIMIT,
    truncateAt: cut,
    feedWindow: window,
    truncated,
    firstLineChars: firstLen,
    hashtags: tags,
    mentions,
    links,
    emoji: emoji.length,
    asks,
    lang,
    checks,
    verdict,
  };
}

// Versione semplificata di textwrap.wrap di Python (spezza su spazi, trattini e parole troppo lunghe).
function wrap(text: string, width: number): string[] {
  const chunks = text
    .replace(/\s/g, ' ')
    .split(/( +)/)
    .flatMap((w) => (w.trim() ? w.split(/(?<=[A-Za-z]-)(?=[A-Za-z])/) : [w]))
    .filter((c) => c.length);
  const lines: string[] = [];
  let cur = '';
  for (const chunk of chunks) {
    if (!chunk.trim()) {
      if (cur) cur += chunk;
      continue;
    }
    let rest = chunk;
    while (rest) {
      const room = width - cpLen(cur);
      if (cpLen(rest) <= room) {
        cur += rest;
        rest = '';
      } else if (cur.trim() && cpLen(rest) <= width) {
        lines.push(cur.trimEnd());
        cur = '';
      } else {
        // parola più lunga della riga: si spezza
        const cps = Array.from(rest);
        const take = room > 0 ? room : width;
        if (room <= 0) {
          lines.push(cur.trimEnd());
          cur = '';
        }
        cur += cps.slice(0, take).join('');
        rest = cps.slice(take).join('');
        if (rest) {
          lines.push(cur.trimEnd());
          cur = '';
        }
      }
    }
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
}

const padEnd = (s: string, n: number): string => s + ' '.repeat(Math.max(0, n - cpLen(s)));

/** Riquadro "COSA MOSTRA IL FEED", come lo legge chi scorre. */
export function renderFeedBox(window: string, truncated: boolean, width = 52): string {
  const out = ['', '  COSA MOSTRA IL FEED', '  +' + '-'.repeat(width + 2) + '+'];
  const lines = window.split('\n').flatMap((raw) => {
    const w = wrap(raw, width);
    return w.length ? w : [''];
  });
  for (const line of lines.slice(0, 8)) out.push(`  | ${padEnd(line, width)} |`);
  const tail = truncated ? '... altro' : '(caption intera visibile)';
  out.push('  +' + '-'.repeat(Math.max(0, width + 2 - cpLen(tail) - 2)) + ` ${tail} ` + '+');
  return out.join('\n');
}

export function formatCaptionReport(result: CaptionLintResult): string {
  const head =
    `CAPTION LINT  ·  ${result.characters} / ${result.limit} caratteri  ·  ` +
    `${result.hashtags.length} hashtag  ·  ${result.asks.length} CTA`;
  const rule = Math.max(cpLen(head), 62);
  const labelW = Math.max(17, ...result.checks.map((c) => cpLen(c.label) + 1));
  const out = ['', head, '='.repeat(rule), renderFeedBox(result.feedWindow, result.truncated), ''];
  for (const c of result.checks) out.push(`  ${padEnd(c.status, 5)} ${padEnd(c.label, labelW)} ${c.detail}`);
  out.push('-'.repeat(rule));
  out.push(`  VERDETTO  ${result.verdict} (${VERDICT_LABELS[result.verdict]})`, '');
  return out.join('\n');
}
