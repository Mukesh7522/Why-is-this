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
