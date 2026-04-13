import type { Constraint, RationaleTag } from '../types';

export interface SurvivorshipResult {
  stillApplies: boolean;
  evidence: string;
  recommendation?: string;
}

export interface SurvivorshipCheck {
  name: string;
  supportedTags: RationaleTag[];
  check(constraint: Constraint, repoPath: string): Promise<SurvivorshipResult | null>;
}

const registry: SurvivorshipCheck[] = [];

export function registerCheck(check: SurvivorshipCheck): void {
  registry.push(check);
}

export function getChecksForTag(tag: RationaleTag): SurvivorshipCheck[] {
  return registry.filter(c => c.supportedTags.includes(tag));
}
