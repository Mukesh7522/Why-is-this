import { listRationaleFiles, runSurvivorshipChecks } from '@why-is-this/core';

const RESET = '\x1b[0m';
const RED = '\x1b[31m'; const YELLOW = '\x1b[33m'; const GREEN = '\x1b[32m';

export async function runSurvivorship(targetPath: string): Promise<void> {
  const repoPath = process.cwd();
  const prefix = targetPath.replace(/^\.\//, '').replace(/\\/g, '/');
  const records = listRationaleFiles(repoPath)
    .filter(r => r.target.file.replace(/\\/g, '/').startsWith(prefix));

  if (records.length === 0) {
    console.log('No rationale records found in the specified path.');
    return;
  }

  console.log(`\nSURVIVORSHIP REPORT`);
  console.log('═'.repeat(40));

  let expired = 0, uncertain = 0, valid = 0;

  for (const record of records) {
    const constraints = record.rationale.constraintsAtTime.filter(c => c.survivorshipCheck);
    if (constraints.length === 0) continue;

    const flags = await runSurvivorshipChecks(record, repoPath);
    for (const flag of flags) {
      console.log('');
      if (flag.stillApplies === false) { expired++; console.log(`${RED}EXPIRED — action required${RESET}`); }
      else if (flag.stillApplies === null) { uncertain++; console.log(`${YELLOW}UNCERTAIN — verify manually${RESET}`); }
      else { valid++; console.log(`${GREEN}VALID — no action needed${RESET}`); }
      console.log(`  ${record.target.file}:${record.target.lineRange.join('-')} — ${flag.constraintDescription}`);
      if (flag.evidence) console.log(`  Evidence: ${flag.evidence}`);
    }
  }

  console.log(`\nSummary: ${expired} expired · ${uncertain} uncertain · ${valid} valid\n`);
}
