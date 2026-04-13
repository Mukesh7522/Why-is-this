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
