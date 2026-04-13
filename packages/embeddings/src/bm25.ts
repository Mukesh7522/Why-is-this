const STOP_WORDS = new Set(['the','a','an','is','in','it','of','and','or','to','for','with','on','at','by','from','as']);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function termFreq(tokens: string[], term: string): number {
  return tokens.filter(t => t === term).length;
}

/** BM25 relevance between query and document. Returns 0–1 normalized. */
export function bm25Score(query: string, document: string, k1 = 1.5, b = 0.75): number {
  const qTokens = tokenize(query);
  const dTokens = tokenize(document);
  if (qTokens.length === 0 || dTokens.length === 0) return 0;

  const avgLen = 100; // assume average doc length
  const N = 1;       // single document comparison
  let score = 0;

  for (const term of new Set(qTokens)) {
    const tf = termFreq(dTokens, term);
    if (tf === 0) continue;
    const idf = Math.log((N - 0 + 0.5) / (0 + 0.5) + 1); // simplified single-doc IDF
    const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dTokens.length / avgLen));
    score += idf * tfNorm;
  }

  // Normalize to 0–1 using max possible score
  const maxScore = qTokens.length * Math.log(1.5) * (k1 + 1);
  return Math.min(1, score / Math.max(maxScore, 1));
}
