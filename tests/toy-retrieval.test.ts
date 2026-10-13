import { describe, expect, it } from "vitest";
import { chunkToySentences, productionRagToySentences, rankToyPassages, retrievalMetrics, RRF_RANK_CONSTANT, type ToyPassage, type ToySentence } from "@/lib/toy-retrieval";

const sentences: ToySentence[] = [
  { id: "s1", text: "A storm loosened roof tiles.", relevant: true },
  { id: "s2", text: "A draft moved beneath the door.", relevant: false },
  { id: "s3", text: "Heavy rain reached the upper floor.", relevant: true },
];

describe("toy retrieval calculations", () => {
  it("changes chunk text and relevance groups when chunk size changes", () => {
    const singles = chunkToySentences(sentences, 1);
    const pairs = chunkToySentences(sentences, 2);
    expect(singles).toHaveLength(3);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].text).toContain("beneath the door");
    expect(pairs[0].relevant).toBe(true);
    expect(() => chunkToySentences(sentences, 0)).toThrow(RangeError);
  });

  it("distinguishes lexical overlap from a term-frequency-sensitive toy vector ranking", () => {
    const passages: ToyPassage[] = [
      { id: "a", text: "retrieval retrieval retrieval vector search", relevant: false, score: 0 },
      { id: "b", text: "retrieval vector search", relevant: true, score: 0 },
    ];
    const lexical = rankToyPassages("retrieval vector search", passages, "lexical");
    const vector = rankToyPassages("retrieval vector search", passages, "vector");
    expect(lexical[0].id).toBe("a");
    expect(vector[0].id).toBe("b");
  });

  it("makes the lesson fixture's lexical and toy-vector first result observably different", () => {
    const passages = chunkToySentences([
      { id: "s1", text: "retrieval retrieval retrieval vector search", relevant: false },
      { id: "s2", text: "retrieval vector search", relevant: true },
      { id: "s3", text: "dense nearest-neighbor methods compare embeddings", relevant: false },
      { id: "s4", text: "vector search uses embeddings to find related documents", relevant: true },
      { id: "s5", text: "BM25 ranks lexical term overlap", relevant: false },
    ], 1);
    const lexical = rankToyPassages("retrieval vector search", passages, "lexical");
    const vector = rankToyPassages("retrieval vector search", passages, "vector");
    expect(lexical[0].id).toBe("chunk-1");
    expect(vector[0].id).toBe("chunk-2");
  });

  it("fuses rankings and reports metrics from selected evidence labels", () => {
    const passages = chunkToySentences(sentences, 1);
    const fused = rankToyPassages("What loosened the roof before rain reached the floor?", passages, "hybrid");
    const reranked = rankToyPassages("What loosened the roof before rain reached the floor?", passages, "rerank");
    expect(fused).toHaveLength(3);
    expect(reranked).toHaveLength(3);
    const metrics = retrievalMetrics(reranked, 2, 2);
    expect(metrics.relevantFound).toBe(2);
    expect(metrics.recall).toBe(1);
    expect(metrics.precision).toBe(1);
  });

  it("keeps toy source-status boundaries intact at larger chunk sizes", () => {
    const chunks = chunkToySentences(productionRagToySentences, 5);
    expect(chunks.map(({ sourceStatus }) => sourceStatus)).toEqual(["current", "stale", "restricted", "current"]);
    expect(chunks[0].text).not.toContain("obsolete policy");
    expect(chunks[1].text).not.toContain("confidential customer");
  });

  it("makes stale and restricted inclusion displace usable evidence at top two", () => {
    const all = chunkToySentences(productionRagToySentences, 1);
    const cases = [
      { name: "filtered", allowed: ["current"], expected: ["current", "current"], recall: 1 },
      { name: "include stale", allowed: ["current", "stale"], expected: ["stale", "current"], recall: 0.5 },
      { name: "include restricted", allowed: ["current", "restricted"], expected: ["restricted", "current"], recall: 0.5 },
      { name: "include both", allowed: ["current", "stale", "restricted"], expected: ["stale", "restricted"], recall: 0 },
    ];
    for (const { name, allowed, expected, recall } of cases) {
      const eligible = all.filter(({ sourceStatus }) => sourceStatus && allowed.includes(sourceStatus));
      const ranked = rankToyPassages("retrieval vector search", eligible, "hybrid");
      expect(ranked.slice(0, 2).map(({ sourceStatus }) => sourceStatus), name).toEqual(expected);
      expect(retrievalMetrics(ranked, eligible.filter(({ relevant }) => relevant).length, 2).recall, name).toBe(recall);
    }
  });

  it("uses the worked-example RRF constant for toy fusion scores", () => {
    const passages = chunkToySentences(productionRagToySentences.slice(0, 2), 1);
    const fused = rankToyPassages("retrieval vector search", passages, "hybrid");
    expect(RRF_RANK_CONSTANT).toBe(60);
    expect(fused[0].score).toBeCloseTo(1 / 61 + 1 / 61, 8);
  });
});
