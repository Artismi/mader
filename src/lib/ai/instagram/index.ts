// ─── Laboratorio Instagram ───────────────────────────────────────────────────
// Punto d'ingresso unico per gli strumenti del circuito ig-*: lo usano il tool
// `instagramLab` della chat (src/app/api/ai/route.ts) e l'API /api/instagram/lab
// (Finestra di Pubblicazione). Funzioni pure: nessun accesso a file o rete.
//
// Porting TypeScript, con supporto italiano, degli strumenti Python di
// instagram-agent-skill (MIT, Jake Schincariol).

import { z } from 'zod'
import { rankHooks, formatHookRanking } from './hookscore'
import { buildBeatSheet, formatBeatSheet } from './beats'
import { lintCaption, formatCaptionReport } from './caption'
import { humanize, formatHumanizeReport } from './humanize'
import { detect, compareDetect, formatDetectReport } from './detect'
import { buildSwipeFile, parseSwipeTsv, formatSwipeFile } from './swipe'
import { scoreProfile } from './profile'

export { scoreHook, rankHooks, classifyHook } from './hookscore'
export { buildBeatSheet } from './beats'
export { lintCaption } from './caption'
export { humanize } from './humanize'
export { detect, compareDetect } from './detect'
export { buildSwipeFile, parseSwipeTsv } from './swipe'
export { scoreProfile, PROFILE_RUBRIC } from './profile'

const lang = z.enum(['it', 'en', 'auto']).optional()

export const labInputSchema = z.object({
  action: z.enum(['scoreHooks', 'beatSheet', 'lintCaption', 'humanize', 'detect', 'swipe', 'scoreProfile', 'polish']),
  text: z.string().optional().describe('Testo: copione (beatSheet), caption (lintCaption/polish), bozza (humanize/detect)'),
  hooks: z.array(z.string()).optional().describe('scoreHooks: le righe hook parlate da confrontare'),
  compareTo: z.string().optional().describe('detect: versione pulita da confrontare con text (mostra il delta)'),
  targetSec: z.number().optional().describe('beatSheet: durata obiettivo in secondi'),
  wpm: z.number().optional().describe('beatSheet: parole al minuto dello speaker'),
  keywords: z.array(z.string()).optional().describe('lintCaption/polish: 2-3 termini di ricerca da trovare nella caption'),
  rows: z.array(z.object({
    handle: z.string(),
    views: z.number(),
    hook: z.string(),
    followers: z.number().optional(),
    median: z.number().optional(),
    url: z.string().optional(),
  })).optional().describe('swipe: un reel per riga con mediana dell\'account'),
  tsv: z.string().optional().describe('swipe: in alternativa a rows, TSV con intestazione account/followers/median/views/hook'),
  answers: z.record(z.number()).optional().describe('scoreProfile: punti per voce della rubrica'),
  lang,
})

export type LabInput = z.infer<typeof labInputSchema>

export interface LabOutput {
  ok: boolean
  /** Report testuale, pronto per il modello o per un <pre>. */
  report: string
  /** Dati strutturati per la UI. */
  data?: unknown
  error?: string
}

/**
 * "polish" = la catena completa prima della pubblicazione:
 * umanizza → misura (prima/dopo) → linter caption sul testo pulito.
 */
export function polishCaption(text: string, opts: { keywords?: string[]; lang?: 'it' | 'en' | 'auto' } = {}) {
  const human = humanize(text, { lang: opts.lang })
  const score = compareDetect(text, human.text, { lang: opts.lang })
  const caption = lintCaption(human.text, { keywords: opts.keywords, lang: opts.lang })
  return { human, score, caption }
}

/** Punteggi sintetici salvati nei metadati dei post Instagram del piano editoriale. */
export function instagramScores(text: string) {
  const lint = lintCaption(text)
  const human = detect(text)
  return {
    captionVerdict: lint.verdict,
    humanScore: Math.round(human.humanScore * 10) / 10,
    humanVerdict: human.verdict,
  }
}

export function runLab(input: LabInput): LabOutput {
  const fail = (error: string): LabOutput => ({ ok: false, report: error, error })
  const opts = { lang: input.lang }

  switch (input.action) {
    case 'scoreHooks': {
      const hooks = input.hooks?.length ? input.hooks : (input.text ?? '').split('\n')
      const ranked = rankHooks(hooks, opts)
      if (!ranked.length) return fail('Nessun hook da valutare.')
      return { ok: true, report: formatHookRanking(ranked), data: ranked }
    }
    case 'beatSheet': {
      if (!input.text?.trim()) return fail('Serve il copione in text.')
      const sheet = buildBeatSheet(input.text, { targetSec: input.targetSec, wpm: input.wpm, lang: input.lang })
      if (!sheet) return fail('Copione vuoto.')
      return { ok: true, report: formatBeatSheet(sheet), data: sheet }
    }
    case 'lintCaption': {
      if (!input.text?.trim()) return fail('Serve la caption in text.')
      const res = lintCaption(input.text, { keywords: input.keywords, lang: input.lang })
      return { ok: true, report: formatCaptionReport(res), data: res }
    }
    case 'humanize': {
      if (!input.text?.trim()) return fail('Serve la bozza in text.')
      const res = humanize(input.text, opts)
      return { ok: true, report: `${formatHumanizeReport(res)}\n\nTESTO PULITO\n${res.text}`, data: res }
    }
    case 'detect': {
      if (!input.text?.trim()) return fail('Serve il testo in text.')
      const res = input.compareTo ? compareDetect(input.text, input.compareTo, opts) : detect(input.text, opts)
      return { ok: true, report: formatDetectReport(res), data: res }
    }
    case 'swipe': {
      const rows = input.rows?.length ? input.rows : input.tsv ? parseSwipeTsv(input.tsv) : []
      if (!rows.length) return fail('Servono rows o tsv con almeno un reel.')
      const res = buildSwipeFile(rows)
      return { ok: true, report: formatSwipeFile(res), data: res }
    }
    case 'scoreProfile': {
      if (!input.answers) return fail('Servono answers (punti per voce della rubrica).')
      const res = scoreProfile(input.answers)
      const lines = [
        `PUNTEGGIO PROFILO  ${res.total}/${res.max}`,
        ...res.gaps.map(g => `  - ${g.label}: ${g.points}/${g.max} → ${g.fix}`),
        ...res.warnings.map(w => `  ! ${w}`),
      ]
      return { ok: true, report: lines.join('\n'), data: res }
    }
    case 'polish': {
      if (!input.text?.trim()) return fail('Serve la caption in text.')
      const res = polishCaption(input.text, { keywords: input.keywords, lang: input.lang })
      const report = [
        formatHumanizeReport(res.human),
        formatDetectReport(res.score),
        formatCaptionReport(res.caption),
        `TESTO PULITO\n${res.human.text}`,
      ].join('\n\n')
      return { ok: true, report, data: res }
    }
  }
}
