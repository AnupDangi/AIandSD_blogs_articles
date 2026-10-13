export type ToySourceStatus = "current" | "stale" | "restricted";
export type ToySentence = { id: string; text: string; relevant: boolean; sourceStatus?: ToySourceStatus };
export type ToyPassage = { id: string; text: string; relevant: boolean; score: number; sourceStatus?: ToySourceStatus };
export type RetrievalStrategy = "lexical" | "vector" | "hybrid" | "rerank";
export const RRF_RANK_CONSTANT = 60;

// The matching but unusable rows deliberately outrank some current evidence.
// This lets learners see why filtering must precede ranking and context assembly.
export const productionRagToySentences: readonly ToySentence[] = [
  { id: "current-1", text: "Vector search uses embeddings to find related documents.", relevant: true, sourceStatus: "current" },
  { id: "current-2", text: "BM25 ranks lexical term overlap.", relevant: false, sourceStatus: "current" },
  { id: "stale-1", text: "Retrieval vector search uses an obsolete policy snapshot.", relevant: false, sourceStatus: "stale" },
  { id: "restricted-1", text: "Retrieval vector search accesses confidential customer files.", relevant: false, sourceStatus: "restricted" },
  { id: "current-3", text: "Search results need citations tied to current source documents.", relevant: true, sourceStatus: "current" },
];

const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "be", "by", "can", "for", "from", "in", "is", "it", "of", "on", "or", "the", "to", "was", "what", "when", "where", "which", "with"]);
const WORD = /[a-z0-9]+/g;

export function chunkToySentences(sentences: readonly ToySentence[], sentencesPerChunk: number): ToyPassage[] {
  if (!Number.isInteger(sentencesPerChunk) || sentencesPerChunk < 1) throw new RangeError("sentencesPerChunk must be a positive integer");
  const chunks: ToyPassage[] = [];
  for (let start = 0; start < sentences.length;) {
    const sourceStatus = sentences[start].sourceStatus;
    let end = start + 1;
    while (end < sentences.length && end - start < sentencesPerChunk && sentences[end].sourceStatus === sourceStatus) end += 1;
    const group = sentences.slice(start, end);
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      text: group.map(({ text }) => text).join(" "),
      relevant: group.some(({ relevant }) => relevant),
      score: 0,
      sourceStatus,
    });
    start = end;
  }
  return chunks;
}

function terms(text: string): string[] {
  return (text.toLowerCase().match(WORD) ?? []).filter((word) => !STOP_WORDS.has(word));
}

export function lexicalScore(query: string, passage: string): number {
  const queryTerms = new Set(terms(query));
  if (queryTerms.size === 0) return 0;
  const passageTerms = new Set(terms(passage));
  return [...queryTerms].filter((word) => passageTerms.has(word)).length / queryTerms.size;
}

function vector(text: string, dimensions = 128): number[] {
  const output = Array.from({ length: dimensions }, () => 0);
  for (const term of terms(text)) {
    let hash = 2166136261;
    for (let index = 0; index < term.length; index += 1) {
      hash ^= term.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    output[(hash >>> 0) % dimensions] += 1;
  }
  return output;
}

function cosine(left: number[], right: number[]): number {
  const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightNorm = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  return leftNorm && rightNorm ? dot / (leftNorm * rightNorm) : 0;
}

function scoreAndSort(passages: readonly ToyPassage[], score: (passage: ToyPassage) => number): ToyPassage[] {
  return passages.map((passage) => ({ ...passage, score: score(passage) }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
}

function rankFuse(left: readonly ToyPassage[], right: readonly ToyPassage[], rankConstant = RRF_RANK_CONSTANT): ToyPassage[] {
  const combined = new Map<string, ToyPassage>();
  for (const ranking of [left, right]) {
    ranking.forEach((passage, index) => {
      const previous = combined.get(passage.id);
      combined.set(passage.id, {
        ...passage,
        score: (previous?.score ?? 0) + 1 / (rankConstant + index + 1),
      });
    });
  }
  return [...combined.values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

function rerankForCoverageAndOrder(query: string, candidates: readonly ToyPassage[]): ToyPassage[] {
  const sequence = terms(query);
  const queryTerms = new Set(sequence);
  const queryPairs = new Set(sequence.slice(1).map((term, index) => `${sequence[index]} ${term}`));
  return scoreAndSort(candidates, (passage) => {
    const passageTerms = terms(passage.text);
    const set = new Set(passageTerms);
    const coverage = queryTerms.size ? [...queryTerms].filter((term) => set.has(term)).length / queryTerms.size : 0;
    const passagePairs = new Set(passageTerms.slice(1).map((term, index) => `${passageTerms[index]} ${term}`));
    const adjacency = queryPairs.size ? [...queryPairs].filter((pair) => passagePairs.has(pair)).length / queryPairs.size : 0;
    return coverage * 0.65 + adjacency * 0.35;
  });
}

export function rankToyPassages(query: string, passages: readonly ToyPassage[], strategy: RetrievalStrategy): ToyPassage[] {
  const lexical = scoreAndSort(passages, (passage) => lexicalScore(query, passage.text));
  const queryVector = vector(query);
  const vectors = scoreAndSort(passages, (passage) => cosine(queryVector, vector(passage.text)));
  if (strategy === "lexical") return lexical;
  if (strategy === "vector") return vectors;
  const fused = rankFuse(lexical, vectors);
  return strategy === "rerank" ? rerankForCoverageAndOrder(query, fused) : fused;
}

export function retrievalMetrics(ranked: readonly ToyPassage[], relevantPassageCount: number, topK: number) {
  const selected = ranked.slice(0, topK);
  const relevantFound = selected.filter(({ relevant }) => relevant).length;
  return {
    relevantFound,
    recall: relevantPassageCount ? relevantFound / relevantPassageCount : 0,
    precision: selected.length ? relevantFound / selected.length : 0,
  };
}
