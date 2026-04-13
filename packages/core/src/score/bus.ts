import type { BlameEntry } from '../trace/git';

export interface AuthorActivity {
  author: string;
  isActive: boolean;
  lineCount: number;
}

/** Compute inactive author ownership ratio from blame entries */
export function inactiveOwnershipRatio(entries: BlameEntry[], activeAuthors: Set<string>): number {
  if (entries.length === 0) return 0;
  const inactive = entries.filter(e => !activeAuthors.has(e.author)).length;
  return inactive / entries.length;
}

/** Effective bus factor: how many distinct active authors own this region */
export function busFactorScore(entries: BlameEntry[], activeAuthors: Set<string>): number {
  const active = new Set(entries.filter(e => activeAuthors.has(e.author)).map(e => e.author));
  return active.size;
}
