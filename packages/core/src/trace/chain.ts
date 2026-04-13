import type { ChainLink } from '../types';
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
  provider: { similarity: async (a, b) => { const { bm25Score } = await import('@why-is-this/embeddings'); return bm25Score(a, b); } } as EmbeddingProvider,
  confidenceThreshold: 0.3,
  maxLinksPerType: 5,
  depth: 3,
};
