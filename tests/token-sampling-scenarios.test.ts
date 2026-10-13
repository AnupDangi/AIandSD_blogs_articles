import { describe, expect, it } from "vitest";
import { softmax, truncateTopP } from "@/lib/toy-models";
import { getLessonVisualScenario, lessonVisualScenarioManifest, validateAttentionScenarioManifest } from "@/lib/visual-scenarios";

describe("Chapter 2 token-sampling scenario", () => {
  it("matches the authored temperature-one and top-p worked example", () => {
    const scenario = getLessonVisualScenario("ai-02");
    expect(scenario?.engine).toBe("attention");
    if (scenario?.engine !== "attention" || scenario.kind !== "token-sampling") throw new Error("Chapter 2 needs a token-sampling scenario.");

    const probabilities = softmax(scenario.candidates.map(({ logit }) => logit), scenario.defaultTemperature);
    expect(probabilities.map((value) => Number(value.toFixed(3)))).toEqual([0.554, 0.304, 0.101, 0.041]);
    expect(truncateTopP(probabilities, scenario.defaultTopP).map((value) => Number(value.toFixed(3)))).toEqual([0.646, 0.354, 0, 0]);
    expect(lessonVisualScenarioManifest["ai-02"]).toEqual(scenario);
  });

  it("rejects duplicate candidate tokens in an authored scenario", () => {
    const scenario = getLessonVisualScenario("ai-02");
    if (scenario?.engine !== "attention" || scenario.kind !== "token-sampling") throw new Error("Chapter 2 needs a token-sampling scenario.");

    expect(() => validateAttentionScenarioManifest({
      "ai-02": { ...scenario, candidates: [scenario.candidates[0], scenario.candidates[0]] },
    })).toThrow();
  });
});
