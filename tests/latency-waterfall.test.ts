import { describe, expect, it } from "vitest";
import { calculateCriticalPath } from "@/lib/latency-waterfall";
import { getLessonVisualScenario, lessonVisualScenarioManifest, validateProductionTabletopScenarioManifest } from "@/lib/visual-scenarios";

describe("Chapter 27 latency waterfall", () => {
  it("matches the chapter's sequential and independent-tool calculations", () => {
    const scenario = getLessonVisualScenario("ai-27");
    expect(scenario?.engine).toBe("production-tabletop");
    if (scenario?.engine !== "production-tabletop" || scenario.kind !== "critical-path") throw new Error("Chapter 27 needs a critical-path scenario.");

    expect(calculateCriticalPath(scenario, true)).toMatchObject({
      sequentialMs: 5400,
      candidateMs: 3400,
      savedMs: 2000,
      parallelizationValid: true,
    });
  });

  it("keeps the dependent branch sequential instead of claiming a speedup", () => {
    const scenario = getLessonVisualScenario("ai-27");
    if (scenario?.engine !== "production-tabletop" || scenario.kind !== "critical-path") throw new Error("Chapter 27 needs a critical-path scenario.");

    expect(calculateCriticalPath(scenario, false)).toMatchObject({
      sequentialMs: 5400,
      candidateMs: 5400,
      savedMs: 0,
      parallelizationValid: false,
    });
  });

  it("waits for the slower branch when Tool A outlasts Tool B", () => {
    const scenario = getLessonVisualScenario("ai-27");
    if (scenario?.engine !== "production-tabletop" || scenario.kind !== "critical-path") throw new Error("Chapter 27 needs a critical-path scenario.");

    const slowerFirstTool = { ...scenario, firstTool: { ...scenario.firstTool, durationMs: 3000 }, secondTool: { ...scenario.secondTool, durationMs: 2000 } };
    const result = calculateCriticalPath(slowerFirstTool, true);
    expect(result).toMatchObject({ sequentialMs: 5400, candidateMs: 3400, savedMs: 2000 });
    expect(result.candidateSpans.find(({ id }) => id === slowerFirstTool.secondTool.id)).toMatchObject({ startMs: 400, endMs: 2400 });
  });

  it("freezes every authored scenario, including trust-boundary lessons, into the shared manifest", () => {
    expect(lessonVisualScenarioManifest["ai-27"]).toEqual(getLessonVisualScenario("ai-27"));
    expect(lessonVisualScenarioManifest["ai-31"]).toEqual(getLessonVisualScenario("ai-31"));
  });

  it("rejects duplicate tool identities in an authored latency scenario", () => {
    const scenario = getLessonVisualScenario("ai-27");
    if (scenario?.engine !== "production-tabletop" || scenario.kind !== "critical-path") throw new Error("Chapter 27 needs a critical-path scenario.");
    expect(() => validateProductionTabletopScenarioManifest({ "ai-27": { ...scenario, secondTool: { ...scenario.secondTool, id: scenario.firstTool.id } } })).toThrow();
  });

  it("reserves the retrieval identity for the retrieval span", () => {
    const scenario = getLessonVisualScenario("ai-27");
    if (scenario?.engine !== "production-tabletop" || scenario.kind !== "critical-path") throw new Error("Chapter 27 needs a critical-path scenario.");
    expect(() => validateProductionTabletopScenarioManifest({ "ai-27": { ...scenario, firstTool: { ...scenario.firstTool, id: "retrieval" } } })).toThrow();
  });
});
