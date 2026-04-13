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
