import * as fs from 'fs';
import * as path from 'path';
import type { SurvivorshipCheck, SurvivorshipResult } from '../registry';
import type { Constraint } from '../../types';

export const vendorCheck: SurvivorshipCheck = {
  name: 'vendor-package-version',
  supportedTags: ['#vendor'],
  async check(constraint: Constraint, repoPath: string): Promise<SurvivorshipResult | null> {
    const pkgPath = path.join(repoPath, 'package.json');
    if (!fs.existsSync(pkgPath)) return null;

    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
    } catch {
      return null; // malformed package.json — skip check
    }
    const deps: Record<string, string> = {
      ...((pkg.dependencies as Record<string, string>) ?? {}),
      ...((pkg.devDependencies as Record<string, string>) ?? {}),
    };

    const pkgMatch = constraint.description.match(/\b([a-z][a-z0-9-]+)\b/i);
    if (!pkgMatch) return null;

    const pkgName = pkgMatch[1];
    const currentVersion = deps[pkgName];
    if (!currentVersion) return null;

    return {
      stillApplies: true,
      evidence: `${pkgName} is currently at version ${currentVersion} in package.json. Verify if the constraint "${constraint.description}" still applies.`,
      recommendation: `Check if ${pkgName}@${currentVersion} has changed the capability mentioned in the constraint.`,
    };
  },
};
