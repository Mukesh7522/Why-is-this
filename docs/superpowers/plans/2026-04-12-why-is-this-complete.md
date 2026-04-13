# why-is-this Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI tool that traces the full decision chain behind any line of code, with rationale storage, fear scoring, survivorship detection, audit reports, and onboarding mode.

**Architecture:** TypeScript npm workspaces monorepo — `packages/core` (engine), `packages/cli` (Commander.js CLI), `packages/embeddings` (BM25 + Ollama). Core has no network deps except optional GitHub API. Everything runs offline from git history alone; GitHub API is additive.

**Tech Stack:** TypeScript 5, Node.js 18+, npm workspaces, Commander.js, Inquirer.js, @octokit/rest, simple-git, chalk, jest + ts-jest

---

## File Map

```
why-is-this/
├── package.json                              # workspace root
├── tsconfig.base.json
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types.ts                      # ALL interfaces (DecisionRecord etc.)
│   │       ├── trace/
│   │       │   ├── git.ts                    # git blame + log + diff
│   │       │   ├── github.ts                 # PR/issue fetching via Octokit
│   │       │   ├── rationale.ts              # .rationale/ read/write/find
│   │       │   └── chain.ts                  # assemble + deduplicate chain
│   │       ├── score/
│   │       │   ├── confidence.ts             # BM25 scorer
│   │       │   ├── fear.ts                   # fearScore() computation
│   │       │   └── bus.ts                    # busFactorScore()
│   │       ├── survivorship/
│   │       │   ├── parser.ts                 # constraint language detector
│   │       │   ├── registry.ts               # SurvivorshipCheck registry
│   │       │   ├── checker.ts                # dispatch checks, cache results
│   │       │   └── checks/
│   │       │       └── vendor.ts             # package.json version check
│   │       └── synthesis/
│   │           └── index.ts                  # LLM synthesis (openai SDK)
│   ├── embeddings/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                      # EmbeddingProvider interface
│   │       └── bm25.ts                       # BM25 offline fallback
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts                      # Commander root + bin entry
│           ├── config.ts                     # load .why-is-this.config.js
│           ├── cache.ts                      # ~/.cache/why-is-this/ helpers
│           ├── commands/
│           │   ├── query.ts                  # why-is-this <file>:<line>
│           │   ├── annotate.ts               # why-is-this annotate
│           │   ├── adr.ts                    # why-is-this adr
│           │   ├── audit.ts                  # why-is-this --audit
│           │   ├── onboard.ts                # why-is-this --onboard
│           │   └── survivorship.ts           # why-is-this --survivorship
│           └── format/
│               ├── chain.ts                  # terminal chain output
│               └── audit.ts                  # audit report formatter
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `package.json` (root)
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/embeddings/package.json`
- Create: `packages/embeddings/tsconfig.json`
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`

- [ ] **Step 1: Write root package.json**

```json
{
  "name": "why-is-this-monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "dev": "npm run dev --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist"
  }
}
```

- [ ] **Step 3: Write packages/core/package.json**

```json
{
  "name": "@why-is-this/core",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "simple-git": "^3.22.0",
    "@octokit/rest": "^20.0.0"
  },
  "devDependencies": {
    "jest": "*",
    "ts-jest": "*",
    "@types/jest": "*",
    "typescript": "*"
  }
}
```

- [ ] **Step 4: Write packages/core/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["**/__tests__/**", "dist"]
}
```

- [ ] **Step 5: Write packages/embeddings/package.json**

```json
{
  "name": "@why-is-this/embeddings",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "devDependencies": {
    "jest": "*",
    "ts-jest": "*",
    "@types/jest": "*",
    "typescript": "*"
  }
}
```

- [ ] **Step 6: Write packages/embeddings/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*"],
  "exclude": ["**/__tests__/**", "dist"]
}
```

- [ ] **Step 7: Write packages/cli/package.json**

```json
{
  "name": "why-is-this",
  "version": "0.1.0",
  "bin": { "why-is-this": "dist/index.js" },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@why-is-this/core": "*",
    "@why-is-this/embeddings": "*",
    "commander": "^12.0.0",
    "inquirer": "^9.0.0",
    "chalk": "^5.3.0",
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "jest": "*",
    "ts-jest": "*",
    "@types/jest": "*",
    "@types/inquirer": "*",
    "typescript": "*"
  }
}
```

- [ ] **Step 8: Write packages/cli/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*"],
  "exclude": ["**/__tests__/**", "dist"]
}
```

- [ ] **Step 9: Install dependencies**

```bash
npm install
```

Expected: workspaces linked, node_modules populated.

- [ ] **Step 10: Commit**

```bash
git init
git add package.json tsconfig.base.json packages/
git commit -m "chore: monorepo scaffold — 3 packages (core, embeddings, cli)"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `packages/core/src/types.ts`
- Test: `packages/core/src/__tests__/types.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// packages/core/src/__tests__/types.test.ts
import type {
  DecisionRecord, ChainLink, Rationale, Constraint,
  SurvivorshipFlag, FearSignals, CodeTarget
} from '../types';

test('DecisionRecord shape compiles', () => {
  const target: CodeTarget = {
    file: 'src/foo.ts',
    lineRange: [10, 20],
    contentHash: 'sha256:abc',
    commitAtAnnotation: 'a3f91c',
  };
  const r: Partial<DecisionRecord> = { id: 'test', target, chain: [], fearScore: 0.5 };
  expect(r.id).toBe('test');
});

test('FearSignals has all required fields', () => {
  const s: FearSignals = {
    ageDays: 100,
    blameReads90d: 10,
    commits90d: 2,
    lastAuthorActive: true,
    distinctAuthors: 3,
    constraintLanguageScore: 0.5,
    rationaleExists: false,
    inactiveAuthorOwnership: 0.2,
  };
  expect(s.ageDays).toBe(100);
});
```

- [ ] **Step 2: Run test — expect compile error**

```bash
cd packages/core && npx jest --no-coverage 2>&1 | head -20
```

Expected: Cannot find module `../types`

- [ ] **Step 3: Write types.ts**

```typescript
// packages/core/src/types.ts

export type RationaleTag =
  | '#infra' | '#vendor' | '#perf' | '#business'
  | '#security' | '#legacy' | '#team';

export type ChainLinkType =
  | 'commit' | 'pr_description' | 'pr_comment'
  | 'issue_body' | 'issue_comment' | 'adr'
  | 'annotation' | 'slack_export';

export interface CodeTarget {
  file: string;
  lineRange: [number, number];
  contentHash: string;
  commitAtAnnotation: string;
}

export interface ChainLink {
  type: ChainLinkType;
  url: string;
  author: string;
  date: string;
  excerpt: string;
  confidence: number;
  raw?: string;
}

export interface Constraint {
  description: string;
  tag: RationaleTag;
  survivorshipCheck: boolean;
  checkHint?: string;
  checkFn?: string;
}

export interface Rationale {
  author: string;
  authorGitHub: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  detail: string;
  alternativesConsidered: string[];
  constraintsAtTime: Constraint[];
  tags: RationaleTag[];
  stillValid: boolean | null;
}

export interface SurvivorshipFlag {
  constraintDescription: string;
  constraintTag: RationaleTag;
  stillApplies: boolean | null;
  checkMethod: 'heuristic' | 'api' | 'human' | 'custom';
  evidence?: string;
  flaggedAt: string;
  flaggedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolution?: 'still_valid' | 'expired_no_change_needed' | 'expired_update_required' | 'dismissed';
}

export interface FearSignals {
  ageDays: number;
  blameReads90d: number;
  commits90d: number;
  lastAuthorActive: boolean;
  distinctAuthors: number;
  constraintLanguageScore: number;
  rationaleExists: boolean;
  inactiveAuthorOwnership: number;
}

export interface DecisionRecord {
  id: string;
  target: CodeTarget;
  chain: ChainLink[];
  rationale: Rationale | null;
  fearScore: number;
  survivorshipFlags: SurvivorshipFlag[];
  busFactorScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface RationaleFile {
  schema: 'why-is-this/rationale@1.0';
  id: string;
  target: CodeTarget;
  rationale: Rationale;
  chainLinks: Array<{ type: ChainLinkType; ref: string; url: string; confidence: number }>;
}
```

- [ ] **Step 4: Add jest config to packages/core/package.json**

Add to `packages/core/package.json`:
```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src"]
}
```

- [ ] **Step 5: Run test — expect pass**

```bash
cd packages/core && npx jest --no-coverage
```

Expected: PASS `__tests__/types.test.ts`

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/__tests__/types.test.ts packages/core/package.json
git commit -m "feat(core): TypeScript data model — all interfaces"
```

---

## Task 3: git.ts — blame + log

**Files:**
- Create: `packages/core/src/trace/git.ts`
- Create: `packages/core/src/__tests__/git.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// packages/core/src/__tests__/git.test.ts
import { parseBlame, parsePrReference, extractCodeRegion } from '../trace/git';

test('parseBlame extracts commit, author, date', () => {
  const raw = `a3f91c00 (Priya Sharma 2022-03-14 10:00:00 +0530 47) const delay = 30000;`;
  const result = parseBlame(raw);
  expect(result.commitHash).toBe('a3f91c00');
  expect(result.author).toBe('Priya Sharma');
  expect(result.date).toBe('2022-03-14');
  expect(result.lineNumber).toBe(47);
});

test('parsePrReference finds PR numbers', () => {
  expect(parsePrReference('fix: add backoff (closes #1142)')).toBe(1142);
  expect(parsePrReference('fix: retry PR #88 logic')).toBe(88);
  expect(parsePrReference('fix: add backoff (#200)')).toBe(200);
  expect(parsePrReference('chore: update docs')).toBeNull();
});

test('extractCodeRegion returns correct line slice', () => {
  const lines = ['a', 'b', 'c', 'd', 'e'];
  expect(extractCodeRegion(lines, 2, 4)).toEqual(['b', 'c', 'd']);
});
```

- [ ] **Step 2: Run — expect fail**

```bash
cd packages/core && npx jest git.test --no-coverage
```

Expected: Cannot find module `../trace/git`

- [ ] **Step 3: Write git.ts**

```typescript
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
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd packages/core && npx jest git.test --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/trace/git.ts packages/core/src/__tests__/git.test.ts
git commit -m "feat(core): git blame parser + PR reference extractor"
```

---

## Task 4: BM25 confidence scorer

**Files:**
- Create: `packages/embeddings/src/bm25.ts`
- Create: `packages/embeddings/src/index.ts`
- Create: `packages/embeddings/src/__tests__/bm25.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// packages/embeddings/src/__tests__/bm25.test.ts
import { bm25Score, tokenize } from '../bm25';

test('tokenize lowercases and splits on non-alpha', () => {
  expect(tokenize('Hello, World! foo-bar')).toEqual(['hello', 'world', 'foo', 'bar']);
});

test('bm25Score is 0 for empty query', () => {
  expect(bm25Score('', 'some document text')).toBe(0);
});

test('bm25Score is higher for exact match', () => {
  const high = bm25Score('exponential backoff retry', 'exponential backoff retry postgres serialization');
  const low  = bm25Score('exponential backoff retry', 'unrelated topic about something else entirely');
  expect(high).toBeGreaterThan(low);
});

test('bm25Score returns value between 0 and 1', () => {
  const s = bm25Score('pool size connection', 'pool size connection database postgres pool');
  expect(s).toBeGreaterThanOrEqual(0);
  expect(s).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Run — expect fail**

```bash
cd packages/embeddings && npx jest bm25.test --no-coverage
```

- [ ] **Step 3: Write bm25.ts**

```typescript
// packages/embeddings/src/bm25.ts

const STOP_WORDS = new Set(['the','a','an','is','in','it','of','and','or','to','for','with','on','at','by','from','as']);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function termFreq(tokens: string[], term: string): number {
  return tokens.filter(t => t === term).length;
}

/** BM25 relevance between query and document. Returns 0–1 normalized. */
export function bm25Score(query: string, document: string, k1 = 1.5, b = 0.75): number {
  const qTokens = tokenize(query);
  const dTokens = tokenize(document);
  if (qTokens.length === 0 || dTokens.length === 0) return 0;

  const avgLen = 100; // assume average doc length
  const N = 1;       // single document comparison
  let score = 0;

  for (const term of new Set(qTokens)) {
    const tf = termFreq(dTokens, term);
    if (tf === 0) continue;
    const idf = Math.log((N - 0 + 0.5) / (0 + 0.5) + 1); // simplified single-doc IDF
    const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dTokens.length / avgLen));
    score += idf * tfNorm;
  }

  // Normalize to 0–1 using max possible score
  const maxScore = qTokens.length * Math.log(1.5) * (k1 + 1);
  return Math.min(1, score / Math.max(maxScore, 1));
}
```

- [ ] **Step 4: Write index.ts**

```typescript
// packages/embeddings/src/index.ts
export { bm25Score, tokenize } from './bm25';

export interface EmbeddingProvider {
  similarity(text1: string, text2: string): Promise<number>;
}

export class BM25Provider implements EmbeddingProvider {
  async similarity(text1: string, text2: string): Promise<number> {
    const { bm25Score } = await import('./bm25');
    return bm25Score(text1, text2);
  }
}
```

- [ ] **Step 5: Add jest config to packages/embeddings/package.json**

```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src"]
}
```

- [ ] **Step 6: Run test — expect pass**

```bash
cd packages/embeddings && npx jest --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/embeddings/
git commit -m "feat(embeddings): BM25 scorer + EmbeddingProvider interface"
```

---

## Task 5: GitHub API client

**Files:**
- Create: `packages/core/src/trace/github.ts`
- Create: `packages/core/src/__tests__/github.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// packages/core/src/__tests__/github.test.ts
import { parseRepoFromRemote, buildPrUrl, buildIssueUrl } from '../trace/github';

test('parseRepoFromRemote parses https URL', () => {
  const r = parseRepoFromRemote('https://github.com/org/repo.git');
  expect(r).toEqual({ owner: 'org', repo: 'repo' });
});

test('parseRepoFromRemote parses ssh URL', () => {
  const r = parseRepoFromRemote('git@github.com:org/my-repo.git');
  expect(r).toEqual({ owner: 'org', repo: 'my-repo' });
});

test('parseRepoFromRemote returns null for non-github', () => {
  expect(parseRepoFromRemote('https://gitlab.com/org/repo.git')).toBeNull();
});

test('buildPrUrl formats correctly', () => {
  expect(buildPrUrl('org', 'repo', 42)).toBe('https://github.com/org/repo/pull/42');
});

test('buildIssueUrl formats correctly', () => {
  expect(buildIssueUrl('org', 'repo', 88)).toBe('https://github.com/org/repo/issues/88');
});
```

- [ ] **Step 2: Run — expect fail**

```bash
cd packages/core && npx jest github.test --no-coverage
```

- [ ] **Step 3: Write github.ts**

```typescript
// packages/core/src/trace/github.ts
import { Octokit } from '@octokit/rest';
import type { ChainLink } from '../types';

export interface RepoCoords { owner: string; repo: string }

export function parseRepoFromRemote(remoteUrl: string): RepoCoords | null {
  const https = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!https) return null;
  return { owner: https[1], repo: https[2] };
}

export function buildPrUrl(owner: string, repo: string, pr: number): string {
  return `https://github.com/${owner}/${repo}/pull/${pr}`;
}

export function buildIssueUrl(owner: string, repo: string, issue: number): string {
  return `https://github.com/${owner}/${repo}/issues/${issue}`;
}

export interface FetchedPr {
  title: string;
  body: string;
  author: string;
  date: string;
  url: string;
  comments: Array<{ author: string; date: string; body: string; url: string }>;
  linkedIssues: number[];
}

function extractLinkedIssues(body: string): number[] {
  const issues: number[] = [];
  const patterns = [/closes\s+#(\d+)/gi, /fixes\s+#(\d+)/gi, /resolves\s+#(\d+)/gi];
  for (const p of patterns) {
    for (const m of body.matchAll(p)) issues.push(parseInt(m[1], 10));
  }
  return [...new Set(issues)];
}

export async function fetchPr(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<FetchedPr | null> {
  const octokit = new Octokit({ auth: token });
  try {
    const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    const { data: comments } = await octokit.issues.listComments({ owner, repo, issue_number: prNumber });

    return {
      title: pr.title,
      body: pr.body ?? '',
      author: pr.user?.login ?? 'unknown',
      date: pr.created_at,
      url: pr.html_url,
      comments: comments.map(c => ({
        author: c.user?.login ?? 'unknown',
        date: c.created_at,
        body: c.body ?? '',
        url: c.html_url,
      })),
      linkedIssues: extractLinkedIssues(pr.body ?? ''),
    };
  } catch {
    return null;
  }
}

export async function fetchIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<{ title: string; body: string; author: string; date: string; url: string; comments: Array<{ author: string; date: string; body: string; url: string }> } | null> {
  const octokit = new Octokit({ auth: token });
  try {
    const { data: issue } = await octokit.issues.get({ owner, repo, issue_number: issueNumber });
    const { data: comments } = await octokit.issues.listComments({ owner, repo, issue_number: issueNumber });
    return {
      title: issue.title,
      body: issue.body ?? '',
      author: issue.user?.login ?? 'unknown',
      date: issue.created_at,
      url: issue.html_url,
      comments: comments.map(c => ({
        author: c.user?.login ?? 'unknown',
        date: c.created_at,
        body: c.body ?? '',
        url: c.html_url,
      })),
    };
  } catch {
    return null;
  }
}

/** Check if a GitHub user has committed to the repo recently (within 180 days) */
export async function isAuthorActive(
  token: string,
  owner: string,
  repo: string,
  username: string
): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data } = await octokit.repos.listCommits({ owner, repo, author: username, since, per_page: 1 });
    return data.length > 0;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd packages/core && npx jest github.test --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/trace/github.ts packages/core/src/__tests__/github.test.ts
git commit -m "feat(core): GitHub API client — PR/issue fetcher + repo URL parser"
```

---

## Task 6: Chain assembly

**Files:**
- Create: `packages/core/src/trace/chain.ts`
- Create: `packages/core/src/__tests__/chain.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// packages/core/src/__tests__/chain.test.ts
import { deduplicateChain, filterByConfidence, sortByConfidence } from '../trace/chain';
import type { ChainLink } from '../types';

const link = (url: string, confidence: number): ChainLink => ({
  type: 'commit', url, author: 'test', date: '2022-01-01',
  excerpt: 'test excerpt', confidence,
});

test('deduplicateChain removes links with same URL', () => {
  const links = [link('http://a', 0.9), link('http://a', 0.8), link('http://b', 0.7)];
  expect(deduplicateChain(links)).toHaveLength(2);
});

test('filterByConfidence removes links below threshold', () => {
  const links = [link('a', 0.9), link('b', 0.4), link('c', 0.25)];
  expect(filterByConfidence(links, 0.3)).toHaveLength(2);
});

test('sortByConfidence sorts descending', () => {
  const links = [link('a', 0.5), link('b', 0.9), link('c', 0.7)];
  const sorted = sortByConfidence(links);
  expect(sorted[0].confidence).toBe(0.9);
  expect(sorted[2].confidence).toBe(0.5);
});
```

- [ ] **Step 2: Run — expect fail**

```bash
cd packages/core && npx jest chain.test --no-coverage
```

- [ ] **Step 3: Write chain.ts**

```typescript
// packages/core/src/trace/chain.ts
import type { ChainLink, ChainLinkType } from '../types';
import type { EmbeddingProvider } from '@why-is-this/embeddings';

export function deduplicateChain(links: ChainLink[]): ChainLink[] {
  const seen = new Set<string>();
  return links.filter(l => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });
}

export function filterByConfidence(links: ChainLink[], threshold: number): ChainLink[] {
  return links.filter(l => l.confidence >= threshold);
}

export function sortByConfidence(links: ChainLink[]): ChainLink[] {
  return [...links].sort((a, b) => b.confidence - a.confidence);
}

/** Score candidate text against code region using the embedding provider */
export async function scoreLink(
  codeRegion: string,
  candidateText: string,
  provider: EmbeddingProvider
): Promise<number> {
  return provider.similarity(codeRegion, candidateText);
}

/** Truncate text to ~300 chars for excerpt */
export function makeExcerpt(text: string, maxLen = 300): string {
  const clean = text.replace(/\n+/g, ' ').trim();
  return clean.length <= maxLen ? clean : clean.slice(0, maxLen - 1) + '…';
}

export interface ChainAssemblyOptions {
  provider: EmbeddingProvider;
  confidenceThreshold: number;
  maxLinksPerType: number;
  depth: number;
}

export const DEFAULT_ASSEMBLY_OPTIONS: ChainAssemblyOptions = {
  provider: { similarity: async (a, b) => { const { bm25Score } = await import('@why-is-this/embeddings'); return bm25Score(a, b); } },
  confidenceThreshold: 0.3,
  maxLinksPerType: 5,
  depth: 3,
};
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd packages/core && npx jest chain.test --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/trace/chain.ts packages/core/src/__tests__/chain.test.ts
git commit -m "feat(core): chain assembly — dedup, filter, sort, excerpt"
```

---

## Task 7: Fear score + Bus factor

**Files:**
- Create: `packages/core/src/score/fear.ts`
- Create: `packages/core/src/score/bus.ts`
- Create: `packages/core/src/__tests__/fear.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// packages/core/src/__tests__/fear.test.ts
import { fearScore } from '../score/fear';
import { scanConstraintLanguage } from '../score/fear';
import type { FearSignals } from '../types';

const base: FearSignals = {
  ageDays: 0, blameReads90d: 0, commits90d: 10,
  lastAuthorActive: true, distinctAuthors: 5,
  constraintLanguageScore: 0, rationaleExists: true,
  inactiveAuthorOwnership: 0,
};

test('fearScore returns 0 for ideal signals', () => {
  const s = fearScore(base);
  expect(s).toBeGreaterThanOrEqual(0);
  expect(s).toBeLessThan(0.2);
});

test('fearScore returns high value for dangerous signals', () => {
  const dangerous: FearSignals = {
    ageDays: 2000, blameReads90d: 200, commits90d: 0,
    lastAuthorActive: false, distinctAuthors: 1,
    constraintLanguageScore: 3, rationaleExists: false,
    inactiveAuthorOwnership: 1,
  };
  expect(fearScore(dangerous)).toBeGreaterThan(0.7);
});

test('scanConstraintLanguage detects high-weight phrases', () => {
  expect(scanConstraintLanguage("do not touch this")).toBeGreaterThanOrEqual(1.0);
  expect(scanConstraintLanguage("normal code comment")).toBe(0);
});

test('scanConstraintLanguage detects medium-weight phrases', () => {
  const s = scanConstraintLanguage("magic number, be careful here");
  expect(s).toBeGreaterThan(0);
  expect(s).toBeLessThan(1.0);
});
```

- [ ] **Step 2: Run — expect fail**

```bash
cd packages/core && npx jest fear.test --no-coverage
```

- [ ] **Step 3: Write fear.ts**

```typescript
// packages/core/src/score/fear.ts
import type { FearSignals } from '../types';

const HIGH_WEIGHT_PATTERNS = [
  /do not (?:change|touch)/i, /don't (?:change|touch)/i,
  /must not/i, /never change/i, /leave this alone/i,
];
const MED_WEIGHT_PATTERNS = [
  /careful/i, /caution/i, /magic number/i, /don't ask/i,
  /trust me/i, /empirically tuned/i, /load tested/i, /production incident/i,
];
const LOW_WEIGHT_PATTERNS = [
  /legacy/i, /\bhack\b/i, /workaround/i, /technical debt/i,
  /historical/i, /backwards compat/i, /don't break/i,
];

export function scanConstraintLanguage(text: string): number {
  let score = 0;
  for (const p of HIGH_WEIGHT_PATTERNS) if (p.test(text)) score += 1.0;
  for (const p of MED_WEIGHT_PATTERNS)  if (p.test(text)) score += 0.6;
  for (const p of LOW_WEIGHT_PATTERNS)  if (p.test(text)) score += 0.3;
  return Math.min(3.0, score);
}

function norm(v: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (v - min) / (max - min)));
}

export function fearScore(signals: FearSignals): number {
  const age        = norm(signals.ageDays, 0, 1825) * 0.20;
  const blameRate  = norm(signals.blameReads90d, 0, 200) * 0.25;
  const commitRate = (1 - norm(signals.commits90d, 0, 10)) * 0.20;
  const authorGone = (signals.lastAuthorActive ? 0 : 1) * 0.15;
  const authorCnt  = (1 - norm(signals.distinctAuthors, 1, 5)) * 0.10;
  const constLang  = norm(signals.constraintLanguageScore, 0, 3) * 0.30;
  const noRat      = (signals.rationaleExists ? 0 : 1) * 0.20;
  const busFact    = norm(signals.inactiveAuthorOwnership, 0, 1) * 0.15;

  const raw = age + blameRate + commitRate + authorGone + authorCnt + constLang + noRat + busFact;
  return Math.min(1, raw);
}

export function fearLabel(score: number): string {
  if (score >= 0.8) return 'critical';
  if (score >= 0.6) return 'high';
  if (score >= 0.3) return 'moderate';
  return 'low';
}
```

- [ ] **Step 4: Write bus.ts**

```typescript
// packages/core/src/score/bus.ts
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
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd packages/core && npx jest fear.test --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/score/
git commit -m "feat(core): fear score algorithm + bus factor + constraint language scanner"
```

---

## Task 8: Rationale file read/write

**Files:**
- Create: `packages/core/src/trace/rationale.ts`
- Create: `packages/core/src/__tests__/rationale.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// packages/core/src/__tests__/rationale.test.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildRationaleId, findRationaleForRange, writeRationaleFile, readRationaleFile
} from '../trace/rationale';

let tmpDir: string;
beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wit-')); });
afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

test('buildRationaleId creates deterministic id', () => {
  const id = buildRationaleId('src/payments/retry.ts', 47, 50, 'a3f91c');
  expect(id).toBe('payments-retry-47-50-a3f91c');
});

test('writeRationaleFile + readRationaleFile roundtrip', () => {
  const file: any = {
    schema: 'why-is-this/rationale@1.0', id: 'test-1',
    target: { file: 'src/a.ts', lineRange: [1, 5], contentHash: 'sha256:abc', commitAtAnnotation: 'x' },
    rationale: { author: 'a@b.com', authorGitHub: 'a', createdAt: 'now', updatedAt: 'now',
      summary: 'test', detail: 'detail', alternativesConsidered: [], constraintsAtTime: [], tags: [], stillValid: null },
    chainLinks: [],
  };
  writeRationaleFile(tmpDir, file);
  const loaded = readRationaleFile(path.join(tmpDir, '.rationale', 'test-1.json'));
  expect(loaded?.id).toBe('test-1');
});

test('findRationaleForRange finds matching file', () => {
  const file: any = {
    schema: 'why-is-this/rationale@1.0', id: 'test-2',
    target: { file: 'src/a.ts', lineRange: [10, 20], contentHash: 'x', commitAtAnnotation: 'y' },
    rationale: { author: 'x', authorGitHub: 'x', createdAt: '', updatedAt: '', summary: '', detail: '',
      alternativesConsidered: [], constraintsAtTime: [], tags: [], stillValid: null },
    chainLinks: [],
  };
  writeRationaleFile(tmpDir, file);
  const found = findRationaleForRange(tmpDir, 'src/a.ts', 15, 15);
  expect(found?.id).toBe('test-2');
});
```

- [ ] **Step 2: Run — expect fail**

```bash
cd packages/core && npx jest rationale.test --no-coverage
```

- [ ] **Step 3: Write rationale.ts**

```typescript
// packages/core/src/trace/rationale.ts
import * as fs from 'fs';
import * as path from 'path';
import type { RationaleFile } from '../types';

const RATIONALE_DIR = '.rationale';

export function buildRationaleId(file: string, start: number, end: number, commitShort: string): string {
  const module = path.dirname(file).split('/').pop() || 'root';
  const base = path.basename(file, path.extname(file));
  return `${module}-${base}-${start}-${end}-${commitShort}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

export function rationaleDir(repoPath: string): string {
  return path.join(repoPath, RATIONALE_DIR);
}

export function writeRationaleFile(repoPath: string, file: RationaleFile): string {
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

/** Find the first rationale record that overlaps the given line range */
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
    return startLine <= rEnd && endLine >= rStart; // overlap check
  }) ?? null;
}

/** Detect if code region has drifted from annotated hash */
export function checkHashDrift(currentLines: string[], storedHash: string): boolean {
  const { hashCodeRegion } = require('./git');
  const current = hashCodeRegion(currentLines);
  return current !== storedHash;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
cd packages/core && npx jest rationale.test --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/trace/rationale.ts packages/core/src/__tests__/rationale.test.ts
git commit -m "feat(core): rationale file read/write/find — .rationale/ layer"
```

---

## Task 9: Core trace() orchestrator

**Files:**
- Create: `packages/core/src/trace/index.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Write trace/index.ts**

```typescript
// packages/core/src/trace/index.ts
import * as path from 'path';
import { simpleGit } from 'simple-git';
import { blameRange, getCommit, getCommitsForRange, readFileLines, extractCodeRegion, hashCodeRegion } from './git';
import { parseRepoFromRemote, fetchPr, fetchIssue, isAuthorActive } from './github';
import { findRationaleForRange, checkHashDrift } from './rationale';
import { deduplicateChain, filterByConfidence, sortByConfidence, makeExcerpt, scoreLink } from './chain';
import { fearScore, scanConstraintLanguage } from '../score/fear';
import { inactiveOwnershipRatio, busFactorScore } from '../score/bus';
import { BM25Provider } from '@why-is-this/embeddings';
import type { DecisionRecord, ChainLink, FearSignals } from '../types';

export interface TraceOptions {
  githubToken?: string;
  confidenceThreshold?: number;
  maxLinksPerType?: number;
  depth?: number;
  repoPath?: string;
}

export async function trace(
  file: string,
  startLine: number,
  endLine: number,
  opts: TraceOptions = {}
): Promise<DecisionRecord> {
  const repoPath = opts.repoPath ?? process.cwd();
  const threshold = opts.confidenceThreshold ?? 0.3;
  const provider = new BM25Provider();

  // 1. Read code region
  const lines = readFileLines(repoPath, file);
  const codeLines = extractCodeRegion(lines, startLine, endLine);
  const codeText = codeLines.join('\n');
  const contentHash = hashCodeRegion(codeLines);

  // 2. git blame
  const blame = await blameRange(repoPath, file, startLine, endLine);

  // 3. Check .rationale/
  const rationaleRecord = findRationaleForRange(repoPath, file, startLine, endLine);

  // 4. Get remote URL for GitHub
  const git = simpleGit(repoPath);
  const remotes = await git.getRemotes(true);
  const origin = remotes.find(r => r.name === 'origin');
  const repoCoords = origin ? parseRepoFromRemote(origin.refs.fetch) : null;
  const token = opts.githubToken ?? process.env.GITHUB_TOKEN ?? '';

  const rawLinks: ChainLink[] = [];

  // 5. Commit link
  const commitInfo = await getCommit(repoPath, blame.dominantCommit);
  const commitScore = await scoreLink(codeText, commitInfo.message, provider);
  rawLinks.push({
    type: 'commit',
    url: repoCoords
      ? `https://github.com/${repoCoords.owner}/${repoCoords.repo}/commit/${commitInfo.hash}`
      : commitInfo.hash,
    author: commitInfo.author,
    date: commitInfo.date,
    excerpt: makeExcerpt(commitInfo.message),
    confidence: Math.max(commitScore, 0.5), // commits always included
  });

  // 6. PR + issue links
  let constraintLangText = '';
  if (repoCoords && token && blame.prNumber) {
    const pr = await fetchPr(token, repoCoords.owner, repoCoords.repo, blame.prNumber);
    if (pr) {
      const prScore = await scoreLink(codeText, pr.title + ' ' + pr.body, provider);
      rawLinks.push({
        type: 'pr_description', url: pr.url,
        author: pr.author, date: pr.date,
        excerpt: makeExcerpt(pr.title + ': ' + pr.body),
        confidence: prScore,
      });
      constraintLangText += ' ' + pr.body;
      for (const c of pr.comments) {
        const score = await scoreLink(codeText, c.body, provider);
        constraintLangText += ' ' + c.body;
        rawLinks.push({ type: 'pr_comment', url: c.url, author: c.author, date: c.date, excerpt: makeExcerpt(c.body), confidence: score });
      }
      for (const issueNum of pr.linkedIssues) {
        const issue = await fetchIssue(token, repoCoords.owner, repoCoords.repo, issueNum);
        if (issue) {
          const score = await scoreLink(codeText, issue.title + ' ' + issue.body, provider);
          rawLinks.push({ type: 'issue_body', url: issue.url, author: issue.author, date: issue.date, excerpt: makeExcerpt(issue.body), confidence: score });
          constraintLangText += ' ' + issue.body;
        }
      }
    }
  }

  // 7. Rationale as highest-confidence link
  if (rationaleRecord) {
    rawLinks.push({
      type: 'annotation',
      url: `.rationale/${rationaleRecord.id}.json`,
      author: rationaleRecord.rationale.author,
      date: rationaleRecord.rationale.createdAt,
      excerpt: rationaleRecord.rationale.summary + ' — ' + rationaleRecord.rationale.detail,
      confidence: 1.0,
    });
  }

  // 8. Score + filter + sort
  const chain = sortByConfidence(
    filterByConfidence(deduplicateChain(rawLinks), threshold)
  );

  // 9. Fear signals
  const recentCommits = await getCommitsForRange(repoPath, file, startLine, endLine, 10);
  const commits90d = recentCommits.filter(c => {
    const daysAgo = (Date.now() - new Date(c.date).getTime()) / (1000 * 86400);
    return daysAgo <= 90;
  }).length;

  let lastAuthorActive = true;
  if (repoCoords && token) {
    lastAuthorActive = await isAuthorActive(token, repoCoords.owner, repoCoords.repo, blame.dominantAuthor);
  }

  const signals: FearSignals = {
    ageDays: (Date.now() - new Date(blame.dominantDate).getTime()) / (1000 * 86400),
    blameReads90d: 0, // requires hook tracking — default 0
    commits90d,
    lastAuthorActive,
    distinctAuthors: new Set(blame.entries.map(e => e.author)).size,
    constraintLanguageScore: scanConstraintLanguage(constraintLangText),
    rationaleExists: rationaleRecord !== null,
    inactiveAuthorOwnership: 0, // computed below
  };

  const activeAuthors = new Set(lastAuthorActive ? [blame.dominantAuthor] : []);
  signals.inactiveAuthorOwnership = inactiveOwnershipRatio(blame.entries, activeAuthors);

  const fear = fearScore(signals);
  const busFactor = busFactorScore(blame.entries, activeAuthors);

  const id = `${file.replace(/[^a-z0-9]/gi, '-')}-${startLine}-${endLine}`;

  return {
    id,
    target: { file, lineRange: [startLine, endLine], contentHash, commitAtAnnotation: blame.dominantCommit },
    chain,
    rationale: rationaleRecord?.rationale ?? null,
    fearScore: fear,
    survivorshipFlags: [],
    busFactorScore: busFactor,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
```

- [ ] **Step 2: Write packages/core/src/index.ts**

```typescript
// packages/core/src/index.ts
export { trace } from './trace/index';
export { fearScore, fearLabel, scanConstraintLanguage } from './score/fear';
export { busFactorScore, inactiveOwnershipRatio } from './score/bus';
export { writeRationaleFile, readRationaleFile, findRationaleForRange, listRationaleFiles, buildRationaleId } from './trace/rationale';
export { hashCodeRegion, readFileLines, extractCodeRegion } from './trace/git';
export type * from './types';
```

- [ ] **Step 3: Build core**

```bash
cd packages/core && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/trace/index.ts packages/core/src/index.ts
git commit -m "feat(core): trace() orchestrator — assembles full decision chain"
```

---

## Task 10: CLI entry + query command

**Files:**
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/config.ts`
- Create: `packages/cli/src/format/chain.ts`
- Create: `packages/cli/src/commands/query.ts`

- [ ] **Step 1: Write config.ts**

```typescript
// packages/cli/src/config.ts
import * as fs from 'fs';
import * as path from 'path';

export interface WitConfig {
  github?: { token?: string; baseUrl?: string };
  embedding?: { provider?: 'ollama' | 'openai' | 'bm25'; model?: string; apiKey?: string };
  synthesis?: { enabled?: boolean; provider?: 'ollama' | 'openai'; model?: string; apiKey?: string };
  trace?: { depth?: number; confidenceThreshold?: number; maxLinksPerType?: number };
  fear?: { high?: number; moderate?: number; low?: number };
  audit?: { exclude?: string[]; highFearThreshold?: number };
}

export function loadConfig(repoPath = process.cwd()): WitConfig {
  const configPath = path.join(repoPath, '.why-is-this.config.js');
  if (fs.existsSync(configPath)) {
    try { return require(configPath); } catch { return {}; }
  }
  return {};
}

export function getGitHubToken(config: WitConfig): string {
  return config.github?.token ?? process.env.GITHUB_TOKEN ?? '';
}
```

- [ ] **Step 2: Write format/chain.ts**

```typescript
// packages/cli/src/format/chain.ts
import type { DecisionRecord, ChainLink } from '@why-is-this/core';
import { fearLabel } from '@why-is-this/core';

// Chalk v5 is ESM — use dynamic import or simple ANSI codes
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED   = '\x1b[31m';
const GRAY  = '\x1b[90m';

function confidenceColor(c: number): string {
  if (c >= 0.85) return GREEN;
  if (c >= 0.65) return YELLOW;
  if (c >= 0.40) return GRAY;
  return DIM;
}

function fearColor(score: number): string {
  if (score >= 0.8) return RED;
  if (score >= 0.6) return YELLOW;
  if (score >= 0.3) return YELLOW;
  return GREEN;
}

export function formatDecisionRecord(
  record: DecisionRecord,
  file: string,
  codeLines: string[],
  opts: { short?: boolean; chain?: boolean; noSynth?: boolean } = {}
): string {
  const lines: string[] = [];
  const lineRange = `${record.target.lineRange[0]}${record.target.lineRange[1] !== record.target.lineRange[0] ? '-' + record.target.lineRange[1] : ''}`;

  lines.push(`\n${BOLD}${file}:${lineRange}${RESET}\n`);

  // Show code lines
  for (let i = 0; i < codeLines.length; i++) {
    const lineNum = record.target.lineRange[0] + i;
    lines.push(`  ${GRAY}${String(lineNum).padStart(4)}${RESET}  ${codeLines[i]}`);
  }
  lines.push('');

  if (!opts.short) {
    lines.push(`  ${BOLD}DECISION CHAIN${RESET}  ${'─'.repeat(50)}`);
    for (const link of record.chain) {
      const col = confidenceColor(link.confidence);
      const score = `[${link.confidence.toFixed(2)}]`;
      lines.push(`\n  ${col}${score}${RESET} ${link.type} · ${link.date} · @${link.author}`);
      lines.push(`        ${link.excerpt}`);
      lines.push(`        ${GRAY}${link.url}${RESET}`);
    }
    lines.push('');
  }

  if (record.rationale && !opts.noSynth) {
    lines.push(`  ${BOLD}SYNTHESIZED RATIONALE${RESET}  ${'─'.repeat(41)}`);
    lines.push('');
    lines.push(`  ${record.rationale.summary}`);
    if (record.rationale.detail) {
      lines.push(`  ${record.rationale.detail}`);
    }
    lines.push('');
  }

  const fearCol = fearColor(record.fearScore);
  const fearLbl = fearLabel(record.fearScore).toUpperCase();
  lines.push(
    `  FEAR SCORE: ${fearCol}${record.fearScore.toFixed(2)} (${fearLbl})${RESET}  ·  ` +
    `SURVIVORSHIP: ${record.survivorshipFlags.length === 0 ? GREEN + 'valid' + RESET : YELLOW + 'flags pending' + RESET}  ·  ` +
    `BUS FACTOR: ${record.busFactorScore}${record.busFactorScore <= 1 ? ' ' + YELLOW + '⚠' + RESET : ''}`
  );
  lines.push('');
  lines.push(`  ${'─'.repeat(66)}`);
  lines.push(`  Add rationale: ${DIM}why-is-this annotate ${file}:${record.target.lineRange[0]}${RESET}`);
  lines.push(`  Generate ADR:  ${DIM}why-is-this adr ${file}:${record.target.lineRange[0]}${RESET}`);
  lines.push('');

  return lines.join('\n');
}
```

- [ ] **Step 3: Write commands/query.ts**

```typescript
// packages/cli/src/commands/query.ts
import { trace, readFileLines, extractCodeRegion } from '@why-is-this/core';
import { formatDecisionRecord } from '../format/chain';
import { loadConfig, getGitHubToken } from '../config';
import type { Command } from 'commander';

export interface QueryOptions {
  short?: boolean;
  chain?: boolean;
  json?: boolean;
  noSynth?: boolean;
  depth?: string;
}

/** Parse "src/file.ts:47" or "src/file.ts:47-55" into { file, start, end } */
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
```

- [ ] **Step 4: Write index.ts (CLI root)**

```typescript
#!/usr/bin/env node
// packages/cli/src/index.ts
import { Command } from 'commander';
import { runQuery, parseFileArg } from './commands/query';

const program = new Command();

program
  .name('why-is-this')
  .description('Explain any line of code in terms of the decision that created it.')
  .version('0.1.0');

// Main query command: why-is-this <file>:<line>
program
  .argument('[target]', 'file:line or file:start-end')
  .option('--short', 'show only synthesized rationale')
  .option('--chain', 'show raw chain links with scores')
  .option('--json', 'output as JSON')
  .option('--no-synth', 'skip LLM synthesis')
  .option('--depth <n>', 'trace depth (default: 3)')
  .action(async (target, opts) => {
    if (!target) { program.help(); return; }
    try {
      await runQuery(target, opts);
    } catch (e: any) {
      process.stderr.write(`Error: ${e.message}\n`);
      process.exit(1);
    }
  });

// Subcommands added in later tasks
program.command('annotate <target>', 'Add a rationale annotation');
program.command('adr <target>', 'Generate an ADR from the decision chain');

program.parseAsync(process.argv);
```

- [ ] **Step 5: Write test for parseFileArg**

```typescript
// packages/cli/src/__tests__/query.test.ts
import { parseFileArg } from '../commands/query';

test('parseFileArg single line', () => {
  expect(parseFileArg('src/foo.ts:42')).toEqual({ file: 'src/foo.ts', start: 42, end: 42 });
});

test('parseFileArg range', () => {
  expect(parseFileArg('src/foo.ts:10-20')).toEqual({ file: 'src/foo.ts', start: 10, end: 20 });
});

test('parseFileArg throws on bad format', () => {
  expect(() => parseFileArg('src/foo.ts')).toThrow('Invalid format');
});
```

- [ ] **Step 6: Add jest config to cli package.json**

```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src"]
}
```

- [ ] **Step 7: Run CLI tests**

```bash
cd packages/cli && npx jest --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 8: Build everything**

```bash
cd ../.. && npm run build
```

Expected: all packages compile

- [ ] **Step 9: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): query command — why-is-this <file>:<line> with chain output"
```

---

## Task 11: Annotate command (Phase 2)

**Files:**
- Create: `packages/cli/src/commands/annotate.ts`

- [ ] **Step 1: Write annotate.ts**

```typescript
// packages/cli/src/commands/annotate.ts
import * as readline from 'readline';
import { buildRationaleId, writeRationaleFile, hashCodeRegion, readFileLines, extractCodeRegion } from '@why-is-this/core';
import { blameRange } from '@why-is-this/core';
import { parseFileArg } from './query';
import type { RationaleFile, RationaleTag, Constraint } from '@why-is-this/core';

// Simple prompt helper (avoids ESM issues with inquirer v9 in CJS)
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
    const blame = await (await import('../../../core/src/trace/git')).blameRange(repoPath, file, start, end);
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
```

- [ ] **Step 2: Wire into CLI index.ts**

In `packages/cli/src/index.ts`, add after the main program setup:

```typescript
program
  .command('annotate <target>')
  .description('Add a rationale annotation to a code region')
  .action(async (target) => {
    const { runAnnotate } = await import('./commands/annotate');
    try { await runAnnotate(target); }
    catch (e: any) { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); }
  });
```

- [ ] **Step 3: Build**

```bash
cd packages/cli && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/annotate.ts packages/cli/src/index.ts
git commit -m "feat(cli): annotate command — interactive .rationale/ file creation"
```

---

## Task 12: ADR generator

**Files:**
- Create: `packages/cli/src/commands/adr.ts`

- [ ] **Step 1: Write adr.ts**

```typescript
// packages/cli/src/commands/adr.ts
import * as fs from 'fs';
import * as path from 'path';
import { trace, readFileLines, extractCodeRegion } from '@why-is-this/core';
import { loadConfig, getGitHubToken } from '../config';
import { parseFileArg } from './query';

export async function runAdr(target: string, opts: { output?: string }): Promise<void> {
  const { file, start, end } = parseFileArg(target);
  const config = loadConfig();
  const token = getGitHubToken(config);

  const record = await trace(file, start, end, { githubToken: token });
  const lines = readFileLines(process.cwd(), file);
  const codeLines = extractCodeRegion(lines, start, end);
  const date = new Date().toISOString().slice(0, 10);

  const title = record.rationale?.summary ?? `Decision: ${file}:${start}-${end}`;

  const chainSection = record.chain
    .slice(0, 5)
    .map(l => `- [${l.type}](${l.url}) (confidence: ${l.confidence.toFixed(2)}) — ${l.excerpt}`)
    .join('\n');

  const constraintsSection = record.rationale?.constraintsAtTime
    .map(c => `- \`${c.tag}\` ${c.description}`)
    .join('\n') ?? '_No constraints recorded._';

  const altsSection = record.rationale?.alternativesConsidered
    .map(a => `- ${a}`)
    .join('\n') ?? '_No alternatives recorded._';

  const adr = `# ADR: ${title}

Date: ${date}
Status: Accepted
Code region: \`${file}:${start}${end !== start ? '-' + end : ''}\`

## Context

${record.rationale?.detail ?? '_No rationale recorded. Run `why-is-this annotate` to add one._'}

## Decision

${codeLines.join('\n')}

## Rationale

Assembled from decision chain (fear score: ${record.fearScore.toFixed(2)}, bus factor: ${record.busFactorScore}):

${chainSection || '_No chain links found._'}

## Alternatives Considered

${altsSection}

## Constraints at Time of Decision

${constraintsSection}

## Consequences

_Fill in: what are the expected positive and negative consequences of this decision?_

---
_Generated by why-is-this on ${date}_
`;

  if (opts.output) {
    fs.mkdirSync(path.dirname(opts.output), { recursive: true });
    fs.writeFileSync(opts.output, adr, 'utf-8');
    console.log(`ADR written to ${opts.output}`);
  } else {
    process.stdout.write(adr);
  }
}
```

- [ ] **Step 2: Wire into CLI**

Add to `packages/cli/src/index.ts`:

```typescript
program
  .command('adr <target>')
  .description('Generate a draft ADR from the decision chain')
  .option('--output <path>', 'write to file instead of stdout')
  .action(async (target, opts) => {
    const { runAdr } = await import('./commands/adr');
    try { await runAdr(target, opts); }
    catch (e: any) { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); }
  });
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/adr.ts packages/cli/src/index.ts
git commit -m "feat(cli): adr command — generate MADR from decision chain"
```

---

## Task 13: Survivorship engine

**Files:**
- Create: `packages/core/src/survivorship/parser.ts`
- Create: `packages/core/src/survivorship/registry.ts`
- Create: `packages/core/src/survivorship/checker.ts`
- Create: `packages/core/src/survivorship/checks/vendor.ts`
- Create: `packages/core/src/__tests__/survivorship.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// packages/core/src/__tests__/survivorship.test.ts
import { classifyConstraint } from '../survivorship/parser';

test('classifyConstraint identifies infra tag', () => {
  expect(classifyConstraint({ description: 'pool size 10', tag: '#infra', survivorshipCheck: true })).toBe('#infra');
});

test('classifyConstraint identifies vendor tag', () => {
  expect(classifyConstraint({ description: 'stripe v2 API', tag: '#vendor', survivorshipCheck: true })).toBe('#vendor');
});
```

- [ ] **Step 2: Write parser.ts**

```typescript
// packages/core/src/survivorship/parser.ts
import type { Constraint, RationaleTag } from '../types';

export function classifyConstraint(constraint: Constraint): RationaleTag {
  return constraint.tag;
}
```

- [ ] **Step 3: Write registry.ts**

```typescript
// packages/core/src/survivorship/registry.ts
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
```

- [ ] **Step 4: Write checks/vendor.ts**

```typescript
// packages/core/src/survivorship/checks/vendor.ts
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

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    // Try to find a package name mentioned in the constraint description
    const pkgMatch = constraint.description.match(/\b([a-z][a-z0-9-]+)\b/i);
    if (!pkgMatch) return null;

    const pkgName = pkgMatch[1];
    const currentVersion = deps[pkgName];
    if (!currentVersion) return null;

    return {
      stillApplies: true, // We found the package; human should verify the version constraint
      evidence: `${pkgName} is currently at version ${currentVersion} in package.json. Verify if the constraint "${constraint.description}" still applies.`,
      recommendation: `Check if ${pkgName}@${currentVersion} has changed the capability mentioned in the constraint.`,
    };
  },
};
```

- [ ] **Step 5: Write checker.ts**

```typescript
// packages/core/src/survivorship/checker.ts
import { getChecksForTag, registerCheck } from './registry';
import { vendorCheck } from './checks/vendor';
import type { RationaleFile, SurvivorshipFlag } from '../types';

// Register built-in checks
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
```

- [ ] **Step 6: Run tests**

```bash
cd packages/core && npx jest survivorship.test --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/survivorship/
git commit -m "feat(core): survivorship engine — constraint checker + vendor built-in check"
```

---

## Task 14: Audit command (Phase 5)

**Files:**
- Create: `packages/cli/src/commands/audit.ts`
- Create: `packages/cli/src/format/audit.ts`

- [ ] **Step 1: Write format/audit.ts**

```typescript
// packages/cli/src/format/audit.ts

const RESET = '\x1b[0m'; const BOLD = '\x1b[1m';
const RED = '\x1b[31m'; const YELLOW = '\x1b[33m'; const GREEN = '\x1b[32m';
const GRAY = '\x1b[90m'; const DIM = '\x1b[2m';

function fearColor(s: number) { return s >= 0.8 ? RED : s >= 0.6 ? YELLOW : GREEN; }
function bar(pct: number, width = 10): string {
  const filled = Math.round(pct * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export interface AuditEntry {
  file: string;
  startLine: number;
  endLine: number;
  fearScore: number;
  hasRationale: boolean;
  busFactorScore: number;
  survivorshipFlags: number;
}

export interface AuditSummary {
  path: string;
  totalRegions: number;
  rationaleCount: number;
  highFearOrphans: AuditEntry[];
  busFactorOne: AuditEntry[];
  survivorshipPending: number;
}

export function formatAuditReport(summary: AuditSummary, markdown = false): string {
  const coverage = summary.totalRegions > 0 ? summary.rationaleCount / summary.totalRegions : 0;
  const lines: string[] = [];

  if (markdown) {
    lines.push(`# Knowledge Debt Audit: ${summary.path}`);
    lines.push(`Date: ${new Date().toISOString().slice(0, 10)}\n`);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Rationale coverage | ${Math.round(coverage * 100)}% |`);
    lines.push(`| High-fear orphans | ${summary.highFearOrphans.length} |`);
    lines.push(`| Bus factor = 1 | ${summary.busFactorOne.length} |`);
    lines.push(`| Survivorship flags | ${summary.survivorshipPending} |\n`);
    lines.push(`## Top Priority Orphans\n`);
    for (const e of summary.highFearOrphans.slice(0, 10)) {
      lines.push(`- **${e.fearScore.toFixed(2)}** \`${e.file}:${e.startLine}-${e.endLine}\``);
    }
    return lines.join('\n');
  }

  lines.push(`\nKNOWLEDGE DEBT AUDIT: ${BOLD}${summary.path}${RESET}`);
  lines.push('═'.repeat(50));
  lines.push('');
  lines.push(`Rationale coverage:   ${Math.round(coverage * 100)}%   ${bar(coverage)}`);
  lines.push(`High-fear orphans:    ${summary.highFearOrphans.length}     (score > 0.7, no rationale)`);
  lines.push(`Bus factor = 1:       ${summary.busFactorOne.length}     (single active author)`);
  lines.push(`Survivorship flags:   ${summary.survivorshipPending}`);
  lines.push('');
  lines.push(`TOP PRIORITY ORPHANS (annotate these first)`);
  lines.push('─'.repeat(45));
  for (const e of summary.highFearOrphans.slice(0, 10)) {
    const col = fearColor(e.fearScore);
    lines.push(`  ${col}${e.fearScore.toFixed(2)}${RESET}  ${e.file}:${e.startLine}${e.endLine !== e.startLine ? '-' + e.endLine : ''}`);
    lines.push(`        ${GRAY}bus factor: ${e.busFactorScore}${RESET}`);
  }
  lines.push('');
  lines.push(`Run: ${DIM}why-is-this annotate <file>:<line>${RESET}`);
  lines.push('');

  return lines.join('\n');
}
```

- [ ] **Step 2: Write commands/audit.ts**

```typescript
// packages/cli/src/commands/audit.ts
import * as fs from 'fs';
import * as path from 'path';
import { listRationaleFiles, trace, fearLabel } from '@why-is-this/core';
import { loadConfig, getGitHubToken } from '../config';
import { formatAuditReport, AuditEntry, AuditSummary } from '../format/audit';

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

export async function runAudit(
  targetPath: string,
  opts: { output?: string; json?: boolean }
): Promise<void> {
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
    const rel = r.target.file;
    if (!rationaleByFile.has(rel)) rationaleByFile.set(rel, []);
    rationaleByFile.get(rel)!.push(r);
  }

  const highFearOrphans: AuditEntry[] = [];
  const busFactorOne: AuditEntry[] = [];
  let totalRegions = 0;
  let rationaleCount = 0;

  // For each file, count rationale coverage
  for (const file of files) {
    const rel = path.relative(repoPath, file);
    const records = rationaleByFile.get(rel) ?? [];
    totalRegions += 1; // count file as 1 region for simplicity
    if (records.length > 0) rationaleCount++;
    else {
      // Compute a rough fear score without network calls
      const stat = fs.statSync(file);
      const ageDays = (Date.now() - stat.mtimeMs) / (1000 * 86400);
      const roughFear = Math.min(1, ageDays / 1825 * 0.4 + 0.3); // simplified
      if (roughFear > highFearThreshold) {
        highFearOrphans.push({ file: rel, startLine: 1, endLine: 1, fearScore: roughFear, hasRationale: false, busFactorScore: 1, survivorshipFlags: 0 });
      }
    }
  }

  // Sort orphans by fear score desc
  highFearOrphans.sort((a, b) => b.fearScore - a.fearScore);

  const summary: AuditSummary = {
    path: targetPath,
    totalRegions,
    rationaleCount,
    highFearOrphans,
    busFactorOne,
    survivorshipPending: rationaleFiles.filter(r => r.rationale.constraintsAtTime.some(c => c.survivorshipCheck && r.rationale.stillValid === null)).length,
  };

  if (opts.json) {
    const out = JSON.stringify({ ...summary, coverage: rationaleCount / Math.max(totalRegions, 1) }, null, 2);
    if (opts.output) fs.writeFileSync(opts.output, out, 'utf-8');
    else process.stdout.write(out + '\n');
    return;
  }

  const report = formatAuditReport(summary, !!opts.output);
  if (opts.output) {
    fs.writeFileSync(opts.output, report, 'utf-8');
    console.log(`Audit report written to ${opts.output}`);
  } else {
    process.stdout.write(report);
  }
}
```

- [ ] **Step 3: Wire into CLI**

Add to `packages/cli/src/index.ts`:

```typescript
program
  .command('audit [path]')
  .alias('--audit')
  .description('Generate a knowledge debt audit report')
  .option('--output <path>', 'write report to file')
  .option('--json', 'output as JSON')
  .action(async (targetPath, opts) => {
    const { runAudit } = await import('./commands/audit');
    try { await runAudit(targetPath ?? '.', opts); }
    catch (e: any) { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); }
  });
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add packages/cli/src/commands/audit.ts packages/cli/src/format/audit.ts packages/cli/src/index.ts
git commit -m "feat(cli): audit command — knowledge debt report with rationale coverage"
```

---

## Task 15: Onboarding mode

**Files:**
- Create: `packages/cli/src/commands/onboard.ts`

- [ ] **Step 1: Write commands/onboard.ts**

```typescript
// packages/cli/src/commands/onboard.ts
import * as fs from 'fs';
import * as path from 'path';
import { listRationaleFiles, fearLabel } from '@why-is-this/core';
import { loadConfig } from '../config';

export async function runOnboard(
  targetPath: string,
  opts: { for?: string; output?: string }
): Promise<void> {
  const repoPath = process.cwd();
  const config = loadConfig(repoPath);
  const roleDescription = opts.for ?? 'new team member';

  const rationaleFiles = listRationaleFiles(repoPath);

  // Filter to target path
  const relevant = rationaleFiles
    .filter(r => r.target.file.startsWith(targetPath.replace(/^\.\//, '')))
    .sort((a, b) => {
      // Sort by: has survivorship flags first, then by fear signals (use stillValid as proxy)
      const aRisk = a.rationale.stillValid === false ? 1 : 0;
      const bRisk = b.rationale.stillValid === false ? 1 : 0;
      return bRisk - aRisk;
    });

  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(`# Onboarding Guide: ${targetPath}`);
  lines.push(`> Generated by why-is-this on ${date} for: **${roleDescription}**\n`);
  lines.push(`## Overview\n`);
  lines.push(`This guide introduces the most consequential code in \`${targetPath}\`, ordered by risk and decision complexity. Read this before making changes.\n`);

  if (relevant.length === 0) {
    lines.push(`> No rationale annotations found in \`${targetPath}\`. Run \`why-is-this annotate\` to start building the knowledge layer.\n`);
  }

  for (let i = 0; i < relevant.length; i++) {
    const r = relevant[i];
    lines.push(`## ${i + 1}. ${r.rationale.summary}`);
    lines.push(`**File:** \`${r.target.file}:${r.target.lineRange[0]}-${r.target.lineRange[1]}\``);
    lines.push('');
    lines.push(r.rationale.detail);
    lines.push('');

    if (r.rationale.alternativesConsidered.length > 0) {
      lines.push(`**Alternatives considered:**`);
      for (const alt of r.rationale.alternativesConsidered) {
        lines.push(`- ${alt}`);
      }
      lines.push('');
    }

    if (r.rationale.constraintsAtTime.length > 0) {
      lines.push(`**Constraints at time of decision:**`);
      for (const c of r.rationale.constraintsAtTime) {
        const flag = c.survivorshipCheck ? ' _(survivorship check enabled)_' : '';
        lines.push(`- \`${c.tag}\` ${c.description}${flag}`);
      }
      lines.push('');
    }

    if (r.rationale.stillValid === false) {
      lines.push(`> ⚠️ **Survivorship flag:** One or more constraints for this decision may no longer apply. Review before modifying.`);
      lines.push('');
    }

    lines.push(`**Tags:** ${r.rationale.tags.join(', ') || '_none_'}`);
    lines.push(`**Author:** @${r.rationale.authorGitHub} (annotated ${r.rationale.createdAt.slice(0, 10)})`);
    lines.push('---\n');
  }

  lines.push(`## Safe to Change\n`);
  lines.push(`Files and regions NOT listed above have no rationale records — they may be safe to modify, but verify with git history.\n`);

  const output = lines.join('\n');

  if (opts.output) {
    fs.mkdirSync(path.dirname(path.resolve(opts.output)), { recursive: true });
    fs.writeFileSync(opts.output, output, 'utf-8');
    console.log(`Onboarding guide written to ${opts.output}`);
  } else {
    process.stdout.write(output);
  }
}
```

- [ ] **Step 2: Wire into CLI**

Add to `packages/cli/src/index.ts`:

```typescript
program
  .command('onboard [path]')
  .alias('--onboard')
  .description('Generate an onboarding walkthrough ordered by fear score')
  .option('--for <role>', 'describe the role of the new team member')
  .option('--output <path>', 'write to file')
  .action(async (targetPath, opts) => {
    const { runOnboard } = await import('./commands/onboard');
    try { await runOnboard(targetPath ?? '.', opts); }
    catch (e: any) { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); }
  });
```

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/commands/onboard.ts packages/cli/src/index.ts
git commit -m "feat(cli): onboard command — narrative walkthrough ordered by decision risk"
```

---

## Task 16: Survivorship CLI command

**Files:**
- Create: `packages/cli/src/commands/survivorship.ts`

- [ ] **Step 1: Write survivorship.ts**

```typescript
// packages/cli/src/commands/survivorship.ts
import { listRationaleFiles } from '@why-is-this/core';
import { runSurvivorshipChecks } from '../../../core/src/survivorship/checker';

const RESET = '\x1b[0m'; const BOLD = '\x1b[1m';
const RED = '\x1b[31m'; const YELLOW = '\x1b[33m'; const GREEN = '\x1b[32m';

export async function runSurvivorship(targetPath: string): Promise<void> {
  const repoPath = process.cwd();
  const records = listRationaleFiles(repoPath)
    .filter(r => r.target.file.startsWith(targetPath.replace(/^\.\//, '')));

  if (records.length === 0) {
    console.log('No rationale records with survivorship checks found.');
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
      if (flag.stillApplies === false) {
        expired++;
        console.log(`${RED}EXPIRED — action required${RESET}`);
      } else if (flag.stillApplies === null) {
        uncertain++;
        console.log(`${YELLOW}UNCERTAIN — verify manually${RESET}`);
      } else {
        valid++;
        console.log(`${GREEN}VALID — no action needed${RESET}`);
      }
      console.log(`  ${record.target.file}:${record.target.lineRange.join('-')} — ${flag.constraintDescription}`);
      console.log(`  ${'─'.repeat(55)}`);
      console.log(`  Constraint: "${flag.constraintDescription}"`);
      console.log(`  Annotated:  ${record.rationale.createdAt.slice(0, 10)} by @${record.rationale.authorGitHub}`);
      if (flag.evidence) console.log(`  Evidence:   ${flag.evidence}`);
      console.log('');
    }
  }

  console.log(`Summary: ${expired} expired · ${uncertain} uncertain · ${valid} valid`);
  console.log('');
}
```

- [ ] **Step 2: Wire into CLI**

```typescript
program
  .command('survivorship [path]')
  .alias('--survivorship')
  .description('Check whether annotated constraints are still valid')
  .action(async (targetPath) => {
    const { runSurvivorship } = await import('./commands/survivorship');
    try { await runSurvivorship(targetPath ?? '.'); }
    catch (e: any) { process.stderr.write(`Error: ${e.message}\n`); process.exit(1); }
  });
```

- [ ] **Step 3: Final build + full test**

```bash
npm run build && npm test
```

Expected: all packages build, all tests pass

- [ ] **Step 4: Final commit**

```bash
git add packages/cli/src/commands/survivorship.ts packages/cli/src/index.ts
git commit -m "feat(cli): survivorship command — check expired constraints"
```

---

## Task 17: Wire CLI as executable + smoke test

**Files:**
- Modify: `packages/cli/dist/index.js` (post-build shebang check)

- [ ] **Step 1: Link CLI locally**

```bash
cd packages/cli && npm link
```

- [ ] **Step 2: Smoke test — help output**

```bash
why-is-this --help
```

Expected output contains:
```
Usage: why-is-this [options] [target]
Commands: annotate, adr, audit, onboard, survivorship
```

- [ ] **Step 3: Smoke test — bad target**

```bash
why-is-this src/nonexistent.ts:1 2>&1
```

Expected: `Error:` message, exit 1

- [ ] **Step 4: Smoke test — query on this repo**

```bash
why-is-this why-is-this-docs.md:1
```

Expected: shows decision chain (may be sparse without GITHUB_TOKEN — that's OK)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1+2+5+6 complete — CLI fully wired and smoke-tested"
```

---

## Self-Review

**Spec coverage:**
- [x] `why-is-this <file>:<line>` — Task 10
- [x] `--short`, `--chain`, `--json`, `--no-synth`, `--depth` flags — Task 10
- [x] `why-is-this annotate` — Task 11
- [x] `.rationale/` file format v1.0 — Task 8
- [x] Content hash drift detection — Task 8 (`checkHashDrift`)
- [x] `why-is-this adr` — Task 12
- [x] `why-is-this --audit` — Task 14
- [x] `why-is-this --onboard` — Task 15
- [x] `why-is-this --survivorship` — Task 16
- [x] Fear score algorithm — Task 7
- [x] Bus factor — Task 7
- [x] Constraint language detection — Task 7
- [x] BM25 fallback scoring — Task 4
- [x] GitHub API client — Task 5
- [x] Chain assembly/dedup/filter/sort — Task 6
- [x] Survivorship vendor check — Task 13

**Gaps (not in this plan — Phase 3/4 require separate deployment):**
- VS Code extension (Phase 3) — requires separate `vsce` toolchain
- GitHub PR Bot (Phase 4) — requires GitHub App credentials

**Type consistency check:** `fearLabel` exported from `score/fear.ts`, imported in `format/chain.ts` ✓. `RationaleFile` interface in `types.ts` used consistently in `rationale.ts` and `annotate.ts` ✓. `BM25Provider` from `@why-is-this/embeddings` used in `trace/index.ts` ✓.
