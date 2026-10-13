import type { ProductionTabletopScenario } from "@/content/visual-scenario-types";

export type WaterfallSpan = { id: string; label: string; startMs: number; endMs: number };

export function calculateCriticalPath(scenario: ProductionTabletopScenario, branchesIndependent: boolean) {
  const sequentialSpans: WaterfallSpan[] = [{ id: "retrieval", label: "Retrieval", startMs: 0, endMs: scenario.retrievalMs }];
  const firstToolStart = scenario.retrievalMs;
  const secondToolSequentialStart = firstToolStart + scenario.firstTool.durationMs;
  const sequentialCursor = secondToolSequentialStart + scenario.secondTool.durationMs;
  sequentialSpans.push(
    { id: scenario.firstTool.id, label: scenario.firstTool.label, startMs: firstToolStart, endMs: firstToolStart + scenario.firstTool.durationMs },
    { id: scenario.secondTool.id, label: scenario.secondTool.label, startMs: secondToolSequentialStart, endMs: sequentialCursor },
  );

  const candidateSpans: WaterfallSpan[] = [{ id: "retrieval", label: "Retrieval", startMs: 0, endMs: scenario.retrievalMs }];
  const secondToolCandidateStart = branchesIndependent ? scenario.retrievalMs : secondToolSequentialStart;
  const firstToolCandidateEnd = firstToolStart + scenario.firstTool.durationMs;
  const secondToolCandidateEnd = secondToolCandidateStart + scenario.secondTool.durationMs;
  const candidateCursor = branchesIndependent ? Math.max(firstToolCandidateEnd, secondToolCandidateEnd) : secondToolCandidateEnd;
  candidateSpans.push(
    { id: scenario.firstTool.id, label: scenario.firstTool.label, startMs: firstToolStart, endMs: firstToolCandidateEnd },
    { id: scenario.secondTool.id, label: scenario.secondTool.label, startMs: secondToolCandidateStart, endMs: secondToolCandidateEnd },
  );

  return {
    sequentialSpans,
    candidateSpans,
    sequentialMs: sequentialCursor,
    candidateMs: candidateCursor,
    savedMs: sequentialCursor - candidateCursor,
    parallelizationValid: branchesIndependent,
  };
}
