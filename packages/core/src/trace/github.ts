import { Octokit } from '@octokit/rest';

export interface RepoCoords { owner: string; repo: string }

export function parseRepoFromRemote(remoteUrl: string): RepoCoords | null {
  const match = remoteUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
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
