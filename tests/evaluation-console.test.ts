import { describe, expect, it } from "vitest";
import { lessons } from "@/content/catalog";
import { calibrateJudge, costPerSuccessfulTask, decideReleaseCandidate, evaluateTrajectory, inspectTrace, scoreEvaluationSlices } from "@/lib/evaluation-console";
import { evaluationConsoleScenarioManifest } from "@/lib/visual-scenarios";

const scenarios = evaluationConsoleScenarioManifest;

describe("lesson-specific evaluation console scenarios", () => {
  it("maps one unique fixture to every assigned lesson", () => {
    const assigned = lessons.filter((lesson) => lesson.sections.some((section) => section.visual === "evaluation-console"));
    expect(Object.keys(scenarios).sort()).toEqual(assigned.map(({ id }) => id).sort());
    expect(new Set(Object.values(scenarios).map(({ title }) => title)).size).toBe(assigned.length);
  });

  it("reports fixed slice outcomes against a movable floor", () => {
    const scenario = scenarios["ai-22"];
    if (scenario.kind !== "slice-threshold") throw new Error("Expected slice-threshold scenario");
    expect(scoreEvaluationSlices(scenario, 0.72).passing).toBe(2);
    expect(scoreEvaluationSlices(scenario, 0.8).slices.filter(({ passes }) => !passes).map(({ id }) => id)).toEqual(["incomplete", "long", "adversarial"]);
  });

  it("shows judge false passes and false rejects as the confidence floor changes", () => {
    const scenario = scenarios["ai-23"];
    if (scenario.kind !== "judge-calibration") throw new Error("Expected judge-calibration scenario");
    const ordinary = calibrateJudge(scenario, 0.7);
    expect(ordinary.counts).toEqual({ truePass: 3, trueFail: 2, falsePass: 1, falseFail: 0 });
    const strict = calibrateJudge(scenario, 0.9);
    expect(strict.counts.falsePass).toBe(0);
    expect(strict.counts.falseFail).toBe(2);
  });

  it("requires both the final outcome and an acceptable trajectory", () => {
    const scenario = scenarios["ai-24"];
    if (scenario.kind !== "trajectory") throw new Error("Expected trajectory scenario");
    const unsafe = evaluateTrajectory(scenario.runs.find(({ id }) => id === "unsafe-correct")!);
    const safeAbstention = evaluateTrajectory(scenario.runs.find(({ id }) => id === "safe-abstain")!);
    expect(unsafe.finalPass).toBe(true);
    expect(unsafe.pathPass).toBe(false);
    expect(unsafe.accepted).toBe(false);
    expect(safeAbstention.pathPass).toBe(true);
    expect(safeAbstention.accepted).toBe(false);
  });

  it("separates missing spans from trace-ID correlation failures", () => {
    const scenario = scenarios["ai-25"];
    if (scenario.kind !== "trace-completeness") throw new Error("Expected trace-completeness scenario");
    const inspected = inspectTrace(scenario, "missing-retrieval");
    expect(inspected.missing).toEqual(["retrieval"]);
    expect(inspected.completeness).toBeCloseTo(5 / 6);
    expect(inspected.correlated).toBe(true);
    expect(inspected.reconstructable).toBe(false);
    const split = inspectTrace(scenario, "orphaned");
    expect(split.missing).toEqual([]);
    expect(split.completeness).toBe(1);
    expect(split.correlated).toBe(false);
    expect(split.reconstructable).toBe(false);
    const empty = inspectTrace({ ...scenario, traces: [{ ...scenario.traces[0], presentSpans: [], spanTraceIds: [] }] }, "complete");
    expect(empty.correlationStatus).toBe("unavailable");
    expect(empty.reconstructable).toBe(false);
    expect(inspectTrace(scenario, "complete").reconstructable).toBe(true);
  });

  it("computes cost per success only when at least one task succeeds", () => {
    const scenario = scenarios["ai-26"];
    if (scenario.kind !== "cost-per-success") throw new Error("Expected cost-per-success scenario");
    expect(costPerSuccessfulTask(scenario.candidates[1])).toBeCloseTo(3.2 / 82);
    expect(costPerSuccessfulTask({ ...scenario.candidates[0], successes: 0 })).toBeNull();
  });

  it("blocks aggregate-improving candidates that breach a critical slice floor", () => {
    const scenario = scenarios["ai-34"];
    if (scenario.kind !== "release-gate") throw new Error("Expected release-gate scenario");
    expect(decideReleaseCandidate(scenario, "candidate").promoted).toBe(false);
    expect(decideReleaseCandidate(scenario, "candidate").slices.find(({ id }) => id === "uploaded")?.passes).toBe(false);
    expect(decideReleaseCandidate(scenario, "candidate", true).promoted).toBe(true);
  });
});
