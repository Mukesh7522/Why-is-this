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
