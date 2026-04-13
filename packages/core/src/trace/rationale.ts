import * as fs from 'fs';
import * as path from 'path';
import type { RationaleFile } from '../types';

const RATIONALE_DIR = '.rationale';

export function buildRationaleId(file: string, start: number, end: number, commitShort: string): string {
  const module = path.dirname(file).replace(/\\/g, '/').split('/').pop() || 'root';
  const base = path.basename(file, path.extname(file));
  return `${module}-${base}-${start}-${end}-${commitShort}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

export function rationaleDir(repoPath: string): string {
  return path.join(repoPath, RATIONALE_DIR);
}

const SAFE_ID_RE = /^[a-z0-9][a-z0-9-]{0,127}$/;

export function writeRationaleFile(repoPath: string, file: RationaleFile): string {
  if (!SAFE_ID_RE.test(file.id)) {
    throw new Error(`Invalid rationale id "${file.id}": must match [a-z0-9-], max 128 chars`);
  }
  const dir = rationaleDir(repoPath);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${file.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(file, null, 2), 'utf-8');
  return filePath;
}

export function readRationaleFile(filePath: string): RationaleFile | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RationaleFile;
  } catch {
    return null;
  }
}

export function listRationaleFiles(repoPath: string): RationaleFile[] {
  const dir = rationaleDir(repoPath);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readRationaleFile(path.join(dir, f)))
    .filter((f): f is RationaleFile => f !== null);
}

export function findRationaleForRange(
  repoPath: string,
  file: string,
  startLine: number,
  endLine: number
): RationaleFile | null {
  const records = listRationaleFiles(repoPath);
  return records.find(r => {
    if (r.target.file !== file) return false;
    const [rStart, rEnd] = r.target.lineRange;
    return startLine <= rEnd && endLine >= rStart;
  }) ?? null;
}

export function checkHashDrift(currentLines: string[], storedHash: string): boolean {
  const { hashCodeRegion } = require('./git') as { hashCodeRegion: (lines: string[]) => string };
  const current = hashCodeRegion(currentLines);
  return current !== storedHash;
}
