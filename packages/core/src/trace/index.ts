// packages/core/src/trace/index.ts
import { simpleGit } from 'simple-git';
import { blameRange, getCommit, getCommitsForRange, readFileLines, extractCodeRegion, hashCodeRegion } from './git';
import { parseRepoFromRemote, fetchPr, fetchIssue, isAuthorActive } from './github';
import { findRationaleForRange } from './rationale';
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
  const commitScore = await scoreLink(commitInfo.message, codeText, provider);
  rawLinks.push({
    type: 'commit',
    url: repoCoords
      ? `https://github.com/${repoCoords.owner}/${repoCoords.repo}/commit/${commitInfo.hash}`
      : commitInfo.hash,
    author: commitInfo.author,
    date: commitInfo.date,
    excerpt: makeExcerpt(commitInfo.message),
    confidence: Math.max(commitScore, 0.35),
  });

  // 6. PR + issue links
  let constraintLangText = '';
  if (repoCoords && token && blame.prNumber) {
    const pr = await fetchPr(token, repoCoords.owner, repoCoords.repo, blame.prNumber);
    if (pr) {
      const prScore = await scoreLink(pr.title + ' ' + pr.body, codeText, provider);
      rawLinks.push({
        type: 'pr_description', url: pr.url,
        author: pr.author, date: pr.date,
        excerpt: makeExcerpt(pr.title + ': ' + pr.body),
        confidence: prScore,
      });
      constraintLangText += ' ' + pr.body;
      for (const c of pr.comments) {
        const score = await scoreLink(c.body, codeText, provider);
        constraintLangText += ' ' + c.body;
        rawLinks.push({ type: 'pr_comment', url: c.url, author: c.author, date: c.date, excerpt: makeExcerpt(c.body), confidence: score });
      }
      for (const issueNum of pr.linkedIssues) {
        const issue = await fetchIssue(token, repoCoords.owner, repoCoords.repo, issueNum);
        if (issue) {
          const score = await scoreLink(issue.title + ' ' + issue.body, codeText, provider);
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
    blameReads90d: 0,
    commits90d,
    lastAuthorActive,
    distinctAuthors: new Set(blame.entries.map(e => e.author)).size,
    constraintLanguageScore: scanConstraintLanguage(constraintLangText),
    rationaleExists: rationaleRecord !== null,
    inactiveAuthorOwnership: 0,
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
