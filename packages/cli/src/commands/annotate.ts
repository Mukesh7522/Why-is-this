import * as readline from 'readline';
import { buildRationaleId, writeRationaleFile, hashCodeRegion, readFileLines, extractCodeRegion, blameRange } from '@why-is-this/core';
import { parseFileArg } from './query';
import type { RationaleFile, RationaleTag, Constraint } from '@why-is-this/core';

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

export async function runAnnotate(target: string): Promise<void> {
  const { file, start, end } = parseFileArg(target);
  const repoPath = process.cwd();

  const lines = readFileLines(repoPath, file);
  const codeLines = extractCodeRegion(lines, start, end);
  const contentHash = hashCodeRegion(codeLines);

  let dominantCommit = 'unknown';
  try {
    const blame = await blameRange(repoPath, file, start, end);
    dominantCommit = blame.dominantCommit;
  } catch { /* offline ok */ }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`\nAnnotating: ${file}:${start}-${end}\n`);

  const summary = await ask(rl, '? Brief description of what this code does:\n  > ');
  const detail  = await ask(rl, '? Why was this specific approach chosen?\n  > ');
  const alts    = await ask(rl, '? What alternatives were considered? (comma-separated or blank)\n  > ');
  const constraintsRaw = await ask(rl, '? What constraints existed at the time?\n  > ');
  const tagsRaw = await ask(rl, '? Constraint tags (comma-separated: #infra #vendor #perf #business #security #legacy #team)\n  > ');
  const survivorshipRaw = await ask(rl, '? Should constraints be checked for survivorship? (y/n)\n  > ');

  rl.close();

  const tags = tagsRaw.split(/[\s,]+/).filter(t => t.startsWith('#')) as RationaleTag[];
  const survivorshipCheck = survivorshipRaw.toLowerCase() === 'y';

  const constraints: Constraint[] = constraintsRaw
    ? constraintsRaw.split(',').map(c => ({
        description: c.trim(),
        tag: (tags[0] ?? '#infra') as RationaleTag,
        survivorshipCheck,
      }))
    : [];

  const id = buildRationaleId(file, start, end, dominantCommit.slice(0, 6));
  const now = new Date().toISOString();

  const rationaleFile: RationaleFile = {
    schema: 'why-is-this/rationale@1.0',
    id,
    target: { file, lineRange: [start, end], contentHash, commitAtAnnotation: dominantCommit },
    rationale: {
      author: process.env.GIT_AUTHOR_EMAIL ?? process.env.USER ?? 'unknown',
      authorGitHub: process.env.GITHUB_USER ?? 'unknown',
      createdAt: now,
      updatedAt: now,
      summary,
      detail,
      alternativesConsidered: alts ? alts.split(',').map(a => a.trim()) : [],
      constraintsAtTime: constraints,
      tags,
      stillValid: null,
    },
    chainLinks: [],
  };

  const outPath = writeRationaleFile(repoPath, rationaleFile);
  console.log(`\nRationale saved to ${outPath}`);
  console.log(`Commit with: git add .rationale/ && git commit -m "docs: add rationale for ${file}:${start}-${end}"`);
}
