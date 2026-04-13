import * as fs from 'fs';
import * as path from 'path';
import { listRationaleFiles } from '@why-is-this/core';
import { loadConfig } from '../config';
import { formatAuditReport, AuditEntry, AuditSummary } from '../format/audit';
import { writeOutput } from '../util';

const DEFAULT_EXCLUDE = ['node_modules', 'dist', '.git', '.next', 'coverage'];

function walkFiles(dir: string, exclude: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (exclude.some(ex => entry.name.includes(ex))) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkFiles(full, exclude));
    else if (/\.(ts|js|py|go|rs|java|rb|cs|cpp|c|tsx|jsx)$/.test(entry.name)) results.push(full);
  }
  return results;
}

export async function runAudit(targetPath: string, opts: { output?: string; json?: boolean }): Promise<void> {
  const repoPath = process.cwd();
  const config = loadConfig(repoPath);
  const exclude = config.audit?.exclude ?? DEFAULT_EXCLUDE;
  const highFearThreshold = config.audit?.highFearThreshold ?? 0.7;

  const absTarget = path.resolve(repoPath, targetPath);
  const files = fs.statSync(absTarget).isDirectory()
    ? walkFiles(absTarget, exclude)
    : [absTarget];

  const rationaleFiles = listRationaleFiles(repoPath);
  const rationaleByFile = new Map<string, typeof rationaleFiles[0][]>();
  for (const r of rationaleFiles) {
    if (!rationaleByFile.has(r.target.file)) rationaleByFile.set(r.target.file, []);
    rationaleByFile.get(r.target.file)!.push(r);
  }

  const highFearOrphans: AuditEntry[] = [];
  const busFactorOne: AuditEntry[] = [];
  let totalRegions = 0;
  let rationaleCount = 0;

  for (const file of files) {
    const rel = path.relative(repoPath, file).replace(/\\/g, '/');
    const records = rationaleByFile.get(rel) ?? [];
    totalRegions++;
    if (records.length > 0) {
      rationaleCount++;
    } else {
      const stat = fs.statSync(file);
      const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 86400);
      const roughFear = Math.min(1, ageDays / 1825 * 0.4 + 0.3);
      if (roughFear > highFearThreshold) {
        highFearOrphans.push({ file: rel, startLine: 1, endLine: 1, fearScore: roughFear, hasRationale: false, busFactorScore: 1, survivorshipFlags: 0 });
      }
    }
  }

  highFearOrphans.sort((a, b) => b.fearScore - a.fearScore);

  const summary: AuditSummary = {
    path: targetPath,
    totalRegions,
    rationaleCount,
    highFearOrphans,
    busFactorOne,
    survivorshipPending: rationaleFiles.filter(r =>
      r.rationale.constraintsAtTime.some(c => c.survivorshipCheck && r.rationale.stillValid === null)
    ).length,
  };

  if (opts.json) {
    const out = JSON.stringify({ ...summary, coverage: rationaleCount / Math.max(totalRegions, 1) }, null, 2);
    if (opts.output) writeOutput(opts.output, out);
    else process.stdout.write(out + '\n');
    return;
  }

  const report = formatAuditReport(summary, !!opts.output);
  if (opts.output) {
    writeOutput(opts.output, report);
    console.log(`Audit report written to ${opts.output}`);
  } else {
    process.stdout.write(report);
  }
}
