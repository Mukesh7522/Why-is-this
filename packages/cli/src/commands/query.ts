import { trace, readFileLines, extractCodeRegion } from '@why-is-this/core';
import { formatDecisionRecord } from '../format/chain';
import { loadConfig, getGitHubToken } from '../config';

export interface QueryOptions {
  short?: boolean;
  chain?: boolean;
  json?: boolean;
  noSynth?: boolean;
  depth?: string;
}

export function parseFileArg(arg: string): { file: string; start: number; end: number } {
  const match = arg.match(/^(.+):(\d+)(?:-(\d+))?$/);
  if (!match) throw new Error(`Invalid format. Use: <file>:<line> or <file>:<start>-<end>`);
  const start = parseInt(match[2], 10);
  const end = match[3] ? parseInt(match[3], 10) : start;
  return { file: match[1], start, end };
}

export async function runQuery(arg: string, opts: QueryOptions): Promise<void> {
  const { file, start, end } = parseFileArg(arg);
  const config = loadConfig();
  const token = getGitHubToken(config);

  if (!token) {
    process.stderr.write('Warning: GITHUB_TOKEN not set. PR/issue context will be omitted.\n');
  }

  const record = await trace(file, start, end, {
    githubToken: token,
    confidenceThreshold: config.trace?.confidenceThreshold ?? 0.3,
    depth: opts.depth ? parseInt(opts.depth, 10) : (config.trace?.depth ?? 3),
  });

  if (opts.json) {
    process.stdout.write(JSON.stringify(record, null, 2) + '\n');
    return;
  }

  const lines = readFileLines(process.cwd(), file);
  const codeLines = extractCodeRegion(lines, start, end);
  const output = formatDecisionRecord(record, file, codeLines, {
    short: opts.short,
    chain: opts.chain,
    noSynth: opts.noSynth,
  });
  process.stdout.write(output);
}
