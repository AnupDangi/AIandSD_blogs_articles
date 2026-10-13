import { describe, expect, it } from "vitest";
import { getLessonVisualScenario, validateAttentionScenarioManifest } from "@/lib/visual-scenarios";

describe("Chapter 3 attention scenario", () => {
  it("uses the authored causal-mask token sequence and starts at the lesson's target query", () => {
    const scenario = getLessonVisualScenario("ai-03");
    expect(scenario?.engine).toBe("attention");
    if (scenario?.engine !== "attention" || scenario.kind !== "attention-mechanism") throw new Error("Chapter 3 needs an attention-mechanism scenario.");

    expect(scenario.tokens[scenario.defaultQueryIndex]).toBe("placed");
    expect(scenario.defaultQueryIndex).toBe(2);
    expect(scenario.defaultCausalMask).toBe(true);
    expect(scenario.tokens.length).toBeGreaterThan(scenario.defaultQueryIndex + 1);
  });

  it("rejects a query index outside its token sequence", () => {
    const scenario = getLessonVisualScenario("ai-03");
    if (scenario?.engine !== "attention" || scenario.kind !== "attention-mechanism") throw new Error("Chapter 3 needs an attention-mechanism scenario.");
    expect(() => validateAttentionScenarioManifest({ "ai-03": { ...scenario, defaultQueryIndex: scenario.tokens.length } })).toThrow();
  });
});
