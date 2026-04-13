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
