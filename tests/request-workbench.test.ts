import { describe, expect, it } from "vitest";
import { lessons } from "@/content/catalog";
import { advancePromptCache, evaluateAnswerExample, routeRequestTask, summarizePromptVersion, traceRequestPipeline } from "@/lib/request-workbench";
import { requestWorkbenchScenarioManifest, validateRequestWorkbenchScenarioManifest } from "@/lib/visual-scenarios";

const scenarios = requestWorkbenchScenarioManifest;

describe("lesson-specific request workbench scenarios", () => {
  it("provides one distinct, engine-matched fixture for every assigned lesson", () => {
    const assigned = lessons.filter((lesson) => lesson.sections.some((section) => section.visual === "request-workbench"));
    expect(Object.keys(scenarios).sort()).toEqual(assigned.map(({ id }) => id).sort());
    for (const lesson of assigned) expect(scenarios[lesson.id].engine).toBe("request-workbench");
    expect(new Set(Object.values(scenarios).map(({ title }) => title)).size).toBe(assigned.length);
  });

  it("stops the grounded request trace at the injected stage", () => {
    const scenario = scenarios["ai-01"];
    if (scenario.kind !== "pipeline") throw new Error("Expected pipeline scenario");
    const clean = traceRequestPipeline(scenario, "none");
    const blocked = traceRequestPipeline(scenario, "retrieve");
    expect(clean.success).toBe(true);
    expect(clean.stages.every(({ status }) => status === "passed")).toBe(true);
    expect(blocked.terminal).toBe("retrieve");
    expect(blocked.stages.map(({ status }) => status)).toEqual(["passed", "failed", "skipped", "skipped"]);
    expect(() => traceRequestPipeline(scenario, "misspelled-stage")).toThrow("Unknown request failure option");
  });

  it("rejects pipeline fixtures whose failure options do not map to unique stages", () => {
    const invalid = structuredClone(scenarios) as Record<string, unknown>;
    const pipeline = invalid["ai-01"] as { stages: { id: string }[]; failureOptions: { id: string }[] };
    pipeline.failureOptions[1].id = "retrive";
    expect(() => validateRequestWorkbenchScenarioManifest(invalid)).toThrow(/does not match a pipeline stage/);

    pipeline.failureOptions[1].id = "retrieve";
    pipeline.stages[1].id = pipeline.stages[0].id;
    expect(() => validateRequestWorkbenchScenarioManifest(invalid)).toThrow(/Stage IDs must be unique/);

    pipeline.stages[1].id = "none";
    expect(() => validateRequestWorkbenchScenarioManifest(invalid)).toThrow(/reserved for the no-failure option/);
  });

  it("distinguishes malformed shape, inconsistent status, and unknown citation", () => {
    const scenario = scenarios["ai-05"];
    if (scenario.kind !== "structured-output") throw new Error("Expected structured-output scenario");
    expect(evaluateAnswerExample(scenario, "valid").accepted).toBe(true);
    expect(evaluateAnswerExample(scenario, "malformed").schemaValid).toBe(false);
    expect(evaluateAnswerExample(scenario, "impossible").answerConsistent).toBe(false);
    expect(evaluateAnswerExample(scenario, "unknown-citation").citationsAllowed).toBe(false);
  });

  it("shows a candidate prompt improve aggregate while regressing on an untrusted-text slice", () => {
    const scenario = scenarios["ai-06"];
    if (scenario.kind !== "prompt-evaluation") throw new Error("Expected prompt-evaluation scenario");
    const baseline = summarizePromptVersion(scenario, "A");
    const candidate = summarizePromptVersion(scenario, "B");
    expect(candidate.rate).toBeGreaterThan(baseline.rate);
    expect(candidate.slices.find(({ slice }) => slice === "Untrusted document text")?.rate).toBeLessThan(baseline.slices.find(({ slice }) => slice === "Untrusted document text")?.rate ?? 1);
  });

  it("routes synthetic tasks by complexity and withholds answers below the confidence floor", () => {
    const scenario = scenarios["ai-07"];
    if (scenario.kind !== "routing") throw new Error("Expected routing scenario");
    expect(scenario.tasks.map((task) => routeRequestTask(task, 0.5))).toEqual(["small", "balanced", "reasoning", "not_found"]);
    expect(routeRequestTask(scenario.tasks[0], 0.97)).toBe("not_found");
  });

  it("models cold, reused, reordered, and restored prompt prefixes deterministically", () => {
    const scenario = scenarios["ai-35"];
    if (scenario.kind !== "prompt-cache") throw new Error("Expected prompt-cache scenario");
    expect(advancePromptCache(scenario, [], "r1")?.hit).toBe(false);
    expect(advancePromptCache(scenario, ["instructions-v1"], "r2")?.hit).toBe(true);
    expect(advancePromptCache(scenario, ["instructions-v1"], "r3")?.hit).toBe(false);
    expect(advancePromptCache(scenario, ["instructions-v1", "question-first"], "r4")?.hit).toBe(true);
  });
});
