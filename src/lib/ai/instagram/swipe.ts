// Swipe file: classifica i reel raccolti per quanto hanno battuto il PROPRIO account,
// riconosce la formula dell'hook e prepara il markdown. Port di swipe.py (ig-viral, MIT, Jake Schincariol).
// Le view assolute non sono evidenza: conta il multiplo sulla mediana dell'account.
// Funzioni pure, nessun accesso a fs/process.

import { classifyHook, scoreHook } from './hookscore';

export interface SwipeRow {
  /** Handle dell'account (colonna "account" nel TSV originale). */
  handle: string;
  views: number;
  /** Prima riga del reel, parlata o a schermo, testuale. */
  hook: string;
  followers?: number | null;
  /** Mediana delle view recenti dell'account: baseline preferita. */
  median?: number | null;
  url?: string;
  onScreen?: string;
  lengthSec?: number | null;
  cta?: string;
  /** Altre colonne del TSV non riconosciute. */
  extra?: Record<string, string>;
}

export interface SwipeReel extends SwipeRow {
  baseline: number;
  /** views / baseline, 2 decimali; null se manca la baseline. */
  outlier: number | null;
  formulaId: number | null;
  formula: string;
  words: number;
  hookScore: number | null;
  hookVerdict: string | null;
}

export interface SwipeResult {
  baseline: 'account median' | 'follower count';
  n: number;
  accounts: number;
  reels: SwipeReel[];
  /** Formule nel terzo migliore, [nome, conteggio] in ordine decrescente. */
  topFormulas: [string, number][];
  /** Formule nel terzo peggiore, per il confronto. */
  bottomFormulas: [string, number][];
  topHookScore: number | null;
  bottomHookScore: number | null;
  topWords: number | null;
  bottomWords: number | null;
  unclassified: number;
}

export interface SwipeOptions {
  /** Classificatore alternativo; default classifyHook di './hookscore'. */
  classify?: (text: string) => { id: number; name: string } | null;
  /** Scorer alternativo; default scoreHook di './hookscore'. null = salta i punteggi. */
  score?: ((text: string) => { score: number; label: string }) | null;
}

export const UNCLASSIFIED = 'unclassified';

// Originale: [A-Za-z0-9$%'’-]+. Qui Unicode, così "perché" e "città" contano come parole intere.
const WORD_RE = new RegExp("[\\p{L}\\p{N}$%€'’-]+", 'gu');

const round = (x: number, d: number): number => Math.round(x * 10 ** d) / 10 ** d;

function median(vals: number[]): number {
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function med(items: SwipeReel[], key: 'hookScore' | 'words'): number | null {
  const vals = items.map((i) => i[key]).filter((v): v is number => v !== null && v !== undefined);
  return vals.length ? round(median(vals), 1) : null;
}

function countFormulas(items: SwipeReel[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const r of items) counts.set(r.formula, (counts.get(r.formula) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function buildSwipeFile(rows: SwipeRow[], opts: SwipeOptions = {}): SwipeResult {
  const classify = opts.classify ?? classifyHook;
  const score = opts.score === undefined ? scoreHook : opts.score;
  const usedMedian = rows.some((r) => !!r.median);

  const reels: SwipeReel[] = rows.map((r) => {
    const base = r.median || r.followers || 0;
    const f = classify(r.hook);
    const s = score ? score(r.hook) : null;
    return {
      ...r,
      baseline: base,
      outlier: base ? round(r.views / base, 2) : null,
      formulaId: f ? f.id : null,
      formula: f ? f.name : UNCLASSIFIED,
      words: (r.hook.match(WORD_RE) ?? []).length,
      hookScore: s ? round(s.score, 1) : null,
      hookVerdict: s ? s.label : null,
    };
  });

  // Sort stabile, come sorted() di Python.
  const ranked = [...reels].sort((a, b) => (b.outlier ?? 0) - (a.outlier ?? 0));
  const third = Math.max(1, Math.floor(ranked.length / 3));
  const top = ranked.slice(0, third);
  const bottom = ranked.slice(-third);

  return {
    baseline: usedMedian ? 'account median' : 'follower count',
    n: ranked.length,
    accounts: new Set(ranked.map((r) => r.handle ?? '')).size,
    reels: ranked,
    topFormulas: countFormulas(top),
    bottomFormulas: countFormulas(bottom),
    topHookScore: med(top, 'hookScore'),
    bottomHookScore: med(bottom, 'hookScore'),
    topWords: med(top, 'words'),
    bottomWords: med(bottom, 'words'),
    unclassified: ranked.filter((r) => r.formula === UNCLASSIFIED).length,
  };
}

// Alias header (inglese originale + italiano) -> nome canonico.
const COLUMN_ALIASES: Record<string, string> = {
  account: 'account', handle: 'account',
  followers: 'followers', follower: 'followers',
  median: 'median', mediana: 'median',
  views: 'views', view: 'views', visualizzazioni: 'views',
  hook: 'hook',
  url: 'url', link: 'url',
  'on-screen': 'on-screen', onscreen: 'on-screen', 'a schermo': 'on-screen',
  length: 'length', durata: 'length',
  cta: 'cta',
};

const digitsOrNull = (v: string | undefined): number | null => {
  const d = (v ?? '').replace(/[^\d]/g, '');
  return d ? parseInt(d, 10) : null;
};

/**
 * Legge il TSV come swipe.py: righe vuote e commenti (#) ignorati; se la prima riga contiene
 * "views" e "hook" è l'header, altrimenti colonne fisse account/followers/views/hook.
 * Scarta le righe senza view o senza hook. Nota: come l'originale tiene solo le cifre ("1.2M" -> 12).
 */
export function parseSwipeTsv(tsv: string): SwipeRow[] {
  const lines = tsv.split(/\r\n|\r|\n/).filter((l) => l.trim() && !l.trimStart().startsWith('#'));
  if (!lines.length) return [];
  const head = lines[0].split('\t').map((c) => c.trim().toLowerCase());
  const canon = head.map((c) => COLUMN_ALIASES[c] ?? c);
  let cols: string[];
  let body: string[];
  if (canon.includes('views') && canon.includes('hook')) {
    cols = canon;
    body = lines.slice(1);
  } else {
    cols = ['account', 'followers', 'views', 'hook'];
    body = lines;
  }

  const rows: SwipeRow[] = [];
  for (const line of body) {
    const cells = line.split('\t').map((c) => c.trim());
    const r: Record<string, string> = {};
    // zip() di Python: le celle in eccesso vengono ignorate
    cols.forEach((c, i) => {
      r[c] = cells[i] ?? '';
    });
    const views = digitsOrNull(r.views) ?? 0;
    if (!views || !r.hook) continue;
    const known = new Set(['account', 'followers', 'median', 'views', 'hook', 'url', 'on-screen', 'length', 'cta']);
    const extra: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) if (!known.has(k)) extra[k] = v;
    const row: SwipeRow = {
      handle: r.account ?? '',
      views,
      hook: r.hook,
      followers: digitsOrNull(r.followers),
      median: digitsOrNull(r.median),
    };
    if (r.url) row.url = r.url;
    if (r['on-screen']) row.onScreen = r['on-screen'];
    if (r.length) row.lengthSec = digitsOrNull(r.length);
    if (r.cta) row.cta = r.cta;
    if (Object.keys(extra).length) row.extra = extra;
    rows.push(row);
  }
  return rows;
}

// Separatore delle migliaia all'italiana, senza dipendere da ICU.
const fmtInt = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtDec = (n: number, d = 1): string => n.toFixed(d).replace('.', ',');
const BASELINE_IT: Record<SwipeResult['baseline'], string> = {
  'account median': "mediana dell'account",
  'follower count': 'numero di follower',
};

export function formatSwipeFile(result: SwipeResult): string {
  const a = result;
  const formulaLabel = (r: SwipeReel) => (r.formulaId ? `#${r.formulaId} ${r.formula}` : 'non classificato');
  const L: string[] = [
    '# Swipe file',
    '',
    `${a.n} reel da ${a.accounts} account. Ordinati per multiplo sulla ${BASELINE_IT[a.baseline]}.`,
    '',
  ];
  if (a.baseline === 'follower count') {
    L.push('> Manca la mediana delle view: il confronto sui follower è più debole. Aggiungi la colonna `median`.', '');
  }

  const outliers = a.reels.filter((r) => (r.outlier ?? 0) > 3);
  L.push('## Outlier (sopra 3x)', '');
  if (outliers.length) {
    for (const r of outliers) {
      L.push(`- **${fmtDec(r.outlier ?? 0)}x** ${formulaLabel(r)} (${r.handle}) - "${r.hook}"`);
    }
  } else {
    L.push('- Nessun reel sopra 3x: in questo batch nessuno ha davvero battuto il proprio account.');
  }
  L.push('');

  L.push('## Cosa separa il terzo migliore dal terzo peggiore', '');
  if (a.topFormulas.length) {
    const bottom = new Map(a.bottomFormulas);
    L.push('Formule nel terzo migliore:');
    for (const [name, c] of a.topFormulas.slice(0, 4)) {
      const label = name === UNCLASSIFIED ? 'non classificato' : name;
      L.push(`- ${label} x${c} (nel terzo peggiore: ${bottom.get(name) ?? 0})`);
    }
    L.push('');
  }
  if (a.topHookScore !== null && a.bottomHookScore !== null) {
    L.push(`- Punteggio hook mediano: sopra ${a.topHookScore.toFixed(0)} vs sotto ${a.bottomHookScore.toFixed(0)}`);
  }
  if (a.topWords !== null && a.bottomWords !== null) {
    L.push(`- Lunghezza hook mediana: sopra ${fmtDec(a.topWords)} parole vs sotto ${fmtDec(a.bottomWords)} parole`);
  }
  L.push(
    `- Non classificati: ${a.unclassified} su ${a.n}. Leggili a mano: lì si nasconde una formula che ancora non hai.`,
    '',
    '> Un batch raccolto a mano è un indizio, non una prova. Dodici reel non dicono nulla;',
    '> quaranta su sei account dicono qualcosa. Raccogline altri prima di crederci.',
    '',
  );

  L.push('## Tutti i reel', '');
  for (const r of a.reels) {
    const mult = r.outlier ? `${fmtDec(r.outlier)}x` : '?';
    L.push(`### ${mult}  ${r.formula === UNCLASSIFIED ? 'non classificato' : r.formula}  (${r.handle})`);
    L.push(`- view: ${fmtInt(r.views)}  baseline: ${fmtInt(r.baseline)}`);
    L.push(`- punteggio hook: ${r.hookScore ?? '-'}${r.hookVerdict ? ` (${r.hookVerdict})` : ''}  parole: ${r.words}`);
    L.push(`- hook: "${r.hook}"`);
    if (r.url) L.push(`- link: ${r.url}`);
    L.push('');
  }
  return L.join('\n') + '\n';
}
