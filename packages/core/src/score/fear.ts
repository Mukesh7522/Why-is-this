import type { FearSignals } from '../types';

const HIGH_WEIGHT_PATTERNS = [
  /do not (?:change|touch)/i, /don't (?:change|touch)/i,
  /must not/i, /never change/i, /leave this alone/i,
];
const MED_WEIGHT_PATTERNS = [
  /careful/i, /caution/i, /magic number/i, /don't ask/i,
  /trust me/i, /empirically tuned/i, /load tested/i, /production incident/i,
];
const LOW_WEIGHT_PATTERNS = [
  /legacy/i, /\bhack\b/i, /workaround/i, /technical debt/i,
  /historical/i, /backwards compat/i, /don't break/i,
];

export function scanConstraintLanguage(text: string): number {
  let score = 0;
  for (const p of HIGH_WEIGHT_PATTERNS) if (p.test(text)) score += 1.0;
  for (const p of MED_WEIGHT_PATTERNS)  if (p.test(text)) score += 0.6;
  for (const p of LOW_WEIGHT_PATTERNS)  if (p.test(text)) score += 0.3;
  return Math.min(3.0, score);
}

function norm(v: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

export function fearScore(signals: FearSignals): number {
  const age        = norm(signals.ageDays, 0, 1825) * 0.20;
  const blameRate  = norm(signals.blameReads90d, 0, 200) * 0.25;
  const commitRate = (1 - norm(signals.commits90d, 0, 10)) * 0.20;
  const authorGone = (signals.lastAuthorActive ? 0 : 1) * 0.15;
  const authorCnt  = (1 - norm(signals.distinctAuthors, 1, 5)) * 0.10;
  const constLang  = norm(signals.constraintLanguageScore, 0, 3) * 0.30;
  const noRat      = (signals.rationaleExists ? 0 : 1) * 0.20;
  const busFact    = norm(signals.inactiveAuthorOwnership, 0, 1) * 0.15;

  const raw = age + blameRate + commitRate + authorGone + authorCnt + constLang + noRat + busFact;
  return Math.min(1, raw);
}

export function fearLabel(score: number): string {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.3) return 'moderate';
  return 'low';
}
