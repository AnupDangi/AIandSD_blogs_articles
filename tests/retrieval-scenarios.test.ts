import { describe, expect, it } from "vitest";
import { lessons } from "@/content/catalog";
import { getRetrievalScenario, retrievalScenarioManifest } from "@/lib/retrieval-scenarios";
import { chunkToySentences, rankToyPassages, retrievalMetrics } from "@/lib/toy-retrieval";

describe("lesson-specific retrieval scenarios", () => {
  const retrievalLessons = lessons.filter((lesson) => lesson.sections.some((section) => section.visual === "retrieval-microscope"));

  it("provides a distinct fixture for every lesson assigned to the retrieval engine", () => {
    expect(Object.keys(retrievalScenarioManifest).sort()).toEqual(retrievalLessons.map(({ id }) => id).sort());
    expect(new Set(retrievalLessons.map((lesson) => getRetrievalScenario(lesson.id).query)).size).toBe(retrievalLessons.length);
    expect(new Set(retrievalLessons.map((lesson) => getRetrievalScenario(lesson.id).sentences.map(({ text }) => text).join("\n"))).size).toBe(retrievalLessons.length);
  });

  it("uses the selected lesson fixture to calculate evidence and metrics", () => {
    const embedding = getRetrievalScenario("ai-08");
    const chunking = getRetrievalScenario("ai-10");
    const production = getRetrievalScenario("ai-13");
    const embeddingResults = rankToyPassages(embedding.query, chunkToySentences(embedding.sentences, embedding.defaultChunkSize), "hybrid");
    const chunkedResults = chunkToySentences(chunking.sentences, chunking.defaultChunkSize);
    const eligibleProductionSentences = production.sentences.filter(({ sourceStatus }) => sourceStatus === "current");
    const productionResults = rankToyPassages(production.query, chunkToySentences(eligibleProductionSentences, 1), "hybrid");

    expect(embeddingResults.some(({ relevant }) => relevant)).toBe(true);
    expect(chunkedResults[0].text).toContain("Section: Storage limits");
    expect(productionResults.every(({ sourceStatus }) => sourceStatus === "current")).toBe(true);
    expect(retrievalMetrics(productionResults, productionResults.filter(({ relevant }) => relevant).length, 2).recall).toBe(1);
  });

  it("keeps access filtering specific to the production retrieval lesson", () => {
    expect(getRetrievalScenario("ai-13").sentences.some(({ sourceStatus }) => sourceStatus === "stale")).toBe(true);
    expect(getRetrievalScenario("ai-13").sentences.some(({ sourceStatus }) => sourceStatus === "restricted")).toBe(true);
    expect(getRetrievalScenario("ai-12").sentences.every(({ sourceStatus }) => sourceStatus === undefined)).toBe(true);
  });
});
