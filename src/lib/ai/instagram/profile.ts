// Punteggio profilo Instagram su 100 (ig-profile). L'LLM assegna i punti per voce,
// questo helper valida i massimali, somma e ordina le correzioni "fix-first".
// Funzioni pure, nessun accesso a fs/process.

import { RUBRIC, type RubricItem } from './data/rubric';

export const PROFILE_RUBRIC = RUBRIC;
export type CriterionId = (typeof RUBRIC.items)[number]['id'];
export type ProfileAnswers = Partial<Record<CriterionId, number>>;

/**
 * Ordine di riscrittura di ig-profile/SKILL.md, usato solo a parità di punti persi
 * (la regola principale è: prima ciò che perde più punti).
 */
const FIX_PRIORITY: readonly CriterionId[] = [
  'name_field',
  'bio_first_line',
  'pinned_three',
  'highlights',
  'link',
  'grid_legibility',
];

export interface ProfileItemScore {
  id: CriterionId;
  label: string;
  points: number;
  max: number;
  lost: number;
}

export interface ProfileGap extends ProfileItemScore {
  fix: string;
  fullMarks: string;
  commonFail: string;
}

export interface ProfileScore {
  total: number;
  max: number;
  items: ProfileItemScore[];
  /** Voci con punti persi, da correggere in quest'ordine. */
  gaps: ProfileGap[];
  /** Voci assenti nella risposta (contate 0). */
  missing: CriterionId[];
  /** Valori corretti o ignorati durante la validazione. */
  warnings: string[];
}

const IDS = new Set<string>(RUBRIC.items.map((i) => i.id));
const priority = (id: CriterionId): number => {
  const p = FIX_PRIORITY.indexOf(id);
  return p === -1 ? FIX_PRIORITY.length + RUBRIC.items.findIndex((i) => i.id === id) : p;
};

export function scoreProfile(answers: ProfileAnswers | Record<string, unknown>): ProfileScore {
  const raw = answers as Record<string, unknown>;
  const warnings: string[] = [];
  const missing: CriterionId[] = [];

  for (const k of Object.keys(raw)) if (!IDS.has(k)) warnings.push(`voce sconosciuta ignorata: ${k}`);

  const items: ProfileItemScore[] = RUBRIC.items.map((item: RubricItem) => {
    const id = item.id as CriterionId;
    const max = item.points;
    const v = raw[id];
    const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
    let pts = 0;
    if (n === undefined || n === null) {
      missing.push(id);
    } else if (typeof n !== 'number' || !Number.isFinite(n)) {
      warnings.push(`${id}: valore non numerico (${String(v)}), contato 0`);
    } else if (n < 0) {
      warnings.push(`${id}: ${n} sotto zero, portato a 0`);
    } else if (n > max) {
      warnings.push(`${id}: ${n} oltre il massimo di ${max}, portato a ${max}`);
      pts = max;
    } else {
      pts = n;
    }
    const points = Math.round(pts * 10) / 10;
    return { id, label: item.label_it, points, max, lost: Math.round((max - points) * 10) / 10 };
  });

  const total = Math.round(items.reduce((s, i) => s + i.points, 0) * 10) / 10;
  const byId = new Map<string, RubricItem>(RUBRIC.items.map((i) => [i.id, i]));
  const gaps: ProfileGap[] = items
    .filter((i) => i.lost > 0)
    .sort((a, b) => b.lost - a.lost || priority(a.id) - priority(b.id))
    .map((i) => {
      const r = byId.get(i.id) as RubricItem;
      return { ...i, fix: r.fix_it, fullMarks: r.full_marks, commonFail: r.common_fail };
    });

  return { total, max: RUBRIC.total, items, gaps, missing, warnings };
}
