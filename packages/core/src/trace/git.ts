// packages/core/src/trace/git.ts
import { simpleGit, SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface BlameEntry {
  commitHash: string;
  author: string;
  date: string;
  lineNumber: number;
  content: string;
}

export interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
  prNumber: number | null;
}

/** Parse one line of `git blame --porcelain` output */
export function parseBlame(line: string): BlameEntry {
  // Format: "<hash> (<Author Name> <date> <time> <tz> <linenum>) <content>"
  const match = line.match(/^([a-f0-9]+)\s+\((.+?)\s+(\d{4}-\d{2}-\d{2})\s+[\d:]+\s+[+-]\d+\s+(\d+)\)\s?(.*)$/);
  if (!match) throw new Error(`Cannot parse blame line: ${line}`);
  return {
    commitHash: match[1],
    author: match[2],
    date: match[3],
    lineNumber: parseInt(match[4], 10),
    content: match[5],
  };
}

/** Extract PR number from commit message. Returns null if not found. */
export function parsePrReference(message: string): number | null {
  const patterns = [
    /\(#(\d+)\)/,
    /closes\s+#(\d+)/i,
    /fixes\s+#(\d+)/i,
    /PR\s+#(\d+)/i,
    /!(\d+)/,
  ];
  for (const p of patterns) {
    const m = message.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/** Extract lines [start..end] inclusive (1-indexed) from a lines array */
export function extractCodeRegion(lines: string[], start: number, end: number): string[] {
  return lines.slice(start - 1, end);
}

/** Hash a code region (array of lines) for drift detection */
export function hashCodeRegion(lines: string[]): string {
  return 'sha256:' + crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
}

export interface GitBlameResult {
  dominantCommit: string;
  dominantAuthor: string;
  dominantDate: string;
  prNumber: number | null;
  entries: BlameEntry[];
}

/** Run git blame on a file for the given line range and return dominant commit */
export async function blameRange(
  repoPath: string,
  file: string,
  startLine: number,
  endLine: number
): Promise<GitBlameResult> {
  const git: SimpleGit = simpleGit(repoPath);
  const raw = await git.raw(['blame', '-p', `-L${startLine},${endLine}`, '--', file]);
  const lines = raw.split('\n').filter(Boolean);

  const entries: BlameEntry[] = [];
  for (const line of lines) {
    if (/^[a-f0-9]{40}/.test(line) && line.includes('(')) {
      try { entries.push(parseBlame(line.replace(/^[a-f0-9]{40}/, m => m.slice(0, 8)))); }
      catch { /* skip malformed */ }
    }
  }

  // Find dominant commit (most frequent)
  const freq: Record<string, number> = {};
  for (const e of entries) freq[e.commitHash] = (freq[e.commitHash] || 0) + 1;
  const dominant = entries.sort((a, b) => freq[b.commitHash] - freq[a.commitHash])[0];

  if (!dominant) throw new Error(`No blame data for ${file}:${startLine}-${endLine}`);

  // Get full commit message for PR extraction
  const log = await git.log({ from: dominant.commitHash + '^', to: dominant.commitHash, maxCount: 1 });
  const message = log.latest?.message ?? '';

  return {
    dominantCommit: dominant.commitHash,
    dominantAuthor: dominant.author,
    dominantDate: dominant.date,
    prNumber: parsePrReference(message),
    entries,
  };
}

/** Get commit info by hash */
export async function getCommit(repoPath: string, hash: string): Promise<CommitInfo> {
  const git: SimpleGit = simpleGit(repoPath);
  const log = await git.log({ from: hash + '^', to: hash, maxCount: 1 });
  const c = log.latest;
  if (!c) throw new Error(`Commit not found: ${hash}`);
  return {
    hash: c.hash.slice(0, 8),
    author: c.author_name,
    date: c.date,
    message: c.message,
    prNumber: parsePrReference(c.message),
  };
}

/** Get recent commits touching a file region */
export async function getCommitsForRange(
  repoPath: string,
  file: string,
  startLine: number,
  endLine: number,
  limit = 5
): Promise<CommitInfo[]> {
  const git: SimpleGit = simpleGit(repoPath);
  const log = await git.log({
    file,
    maxCount: limit,
    '--': null,
  });
  return log.all.map(c => ({
    hash: c.hash.slice(0, 8),
    author: c.author_name,
    date: c.date,
    message: c.message,
    prNumber: parsePrReference(c.message),
  }));
}

/** Read file lines from disk */
export function readFileLines(repoPath: string, file: string): string[] {
  const full = path.join(repoPath, file);
  return fs.readFileSync(full, 'utf-8').split('\n');
}
