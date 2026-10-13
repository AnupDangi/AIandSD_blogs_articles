import { describe, expect, it } from "vitest";
import { estimateKvCacheBytes, estimateKvCacheBytesPerToken, formatBinaryMemory } from "@/lib/inference-scheduler";
import { getLessonVisualScenario, validateInferenceSchedulerScenarioManifest } from "@/lib/visual-scenarios";

describe("Chapter 4 inference scheduler scenario", () => {
  it("preserves the chapter's stated cache assumptions and worked example", () => {
    const scenario = getLessonVisualScenario("ai-04");
    expect(scenario?.engine).toBe("inference-scheduler");
    if (scenario?.engine !== "inference-scheduler") throw new Error("Chapter 4 needs a lesson-specific inference scenario.");

    expect(estimateKvCacheBytesPerToken(scenario)).toBe(131_072);
    expect(formatBinaryMemory(estimateKvCacheBytesPerToken(scenario))).toBe("128 KiB");
    expect(estimateKvCacheBytes(scenario, scenario.defaultSequenceTokens, 1)).toBe(1_073_741_824);
    expect(scenario.defaultSequenceTokens).toBe(8192);
  });

  it("rejects an invalid KV head count or an out-of-range default sequence length", () => {
    const scenario = getLessonVisualScenario("ai-04");
    if (scenario?.engine !== "inference-scheduler") throw new Error("Chapter 4 needs a lesson-specific inference scenario.");
    expect(() => validateInferenceSchedulerScenarioManifest({ "ai-04": { ...scenario, kvHeads: 0 } })).toThrow();
    expect(() => validateInferenceSchedulerScenarioManifest({ "ai-04": { ...scenario, defaultSequenceTokens: 32768 } })).toThrow();
  });
});
