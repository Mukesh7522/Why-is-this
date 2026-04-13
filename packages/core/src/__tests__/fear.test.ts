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
  const s = scanConstraintLanguage("magic number here");
  expect(s).toBeGreaterThan(0);
  expect(s).toBeLessThan(1.0);
});
