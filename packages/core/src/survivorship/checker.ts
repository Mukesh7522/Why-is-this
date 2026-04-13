import { getChecksForTag, registerCheck } from './registry';
import { vendorCheck } from './checks/vendor';
import type { RationaleFile, SurvivorshipFlag } from '../types';

registerCheck(vendorCheck);

export async function runSurvivorshipChecks(
  record: RationaleFile,
  repoPath: string
): Promise<SurvivorshipFlag[]> {
  const flags: SurvivorshipFlag[] = [];
  const constraints = record.rationale.constraintsAtTime.filter(c => c.survivorshipCheck);

  for (const constraint of constraints) {
    const checks = getChecksForTag(constraint.tag);
    for (const check of checks) {
      try {
        const result = await check.check(constraint, repoPath);
        if (result) {
          flags.push({
            constraintDescription: constraint.description,
            constraintTag: constraint.tag,
            stillApplies: result.stillApplies,
            checkMethod: 'api',
            evidence: result.evidence,
            flaggedAt: new Date().toISOString(),
            flaggedBy: check.name,
          });
        }
      } catch { /* skip failed checks */ }
    }
  }

  return flags;
}
