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
