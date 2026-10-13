import { describe, expect, it } from "vitest";
import { canonicalJson, lessonScenarioCalculationVersions, lessonScenarioCalculationVersionsSha256, lessonVisualScenarioManifest, validateAttentionScenarioManifest } from "../src/lib/visual-scenarios";
import { lessons } from "../src/content/applied-ai";
import { buildLessonSnapshots } from "../prisma/lesson-snapshot";
import type { Lesson } from "../src/content/types";

const frozenCalculationVersionsSha256 = "0dda0c6fc7e928d14cd066c7f9dbe0fa9bbfdfeaba5c5d09953118328867d121";

const lesson: Lesson = {
  id: "ai-08", slug: "retrieval", title: "Retrieval", chapter: 1, duration: 20, summary: "Summary",
  outcomes: [], prerequisites: [], moduleId: "foundations", sourceDraft: "docs/applied-ai/ch01.md",
  contentStatus: "draft-needs-editorial-review", formativeQuestionIds: [], assessmentIds: [],
  activityId: "activity-1", visual: "retrieval-microscope",
  sections: [{ id: "ai-08-intro", title: "Intro", summary: "Start", visual: "retrieval-microscope", activity: "predict", resources: [], hints: [] }],
};

describe("scenario calculation versions", () => {
  it("carries calculationVersion v1 on every lesson's visual scenario", () => {
    expect(lessons).toHaveLength(40);
    const versions = lessonScenarioCalculationVersions();
    for (const lesson of lessons) {
      expect(lessonVisualScenarioManifest[lesson.id]).toBeDefined();
      expect(lessonVisualScenarioManifest[lesson.id].calculationVersion).toBe("v1");
      expect(versions[lesson.id]).toBe("v1");
    }
    expect(Object.keys(versions)).toHaveLength(40);
  });

  it("keeps the canonical calculation-version map stable behind a frozen SHA-256", () => {
    expect(lessonScenarioCalculationVersionsSha256()).toBe(frozenCalculationVersionsSha256);
    expect(canonicalJson(lessonScenarioCalculationVersions())).toBe(canonicalJson(Object.fromEntries(lessons.map(({ id }) => [id, "v1"]))));
  });

  it("rejects scenarios that omit calculationVersion", () => {
    const missing = {
      "ai-xx": {
        engine: "attention", kind: "token-sampling", title: "Sampling", prompt: "Prompt",
        defaultTemperature: 1, defaultTopP: 1,
        candidates: [{ token: "a", logit: 0 }, { token: "b", logit: 1 }],
      },
    };
    expect(() => validateAttentionScenarioManifest(missing)).toThrow(/calculationVersion/);
  });

  it("freezes the calculation-version hash into each immutable lesson snapshot", () => {
    const [snapshot] = buildLessonSnapshots([lesson], () => "prose");
    expect(snapshot.metadata.visualScenarioCalculationVersionsSha256).toBe(frozenCalculationVersionsSha256);
    expect(snapshot.metadata.visualScenario?.calculationVersion).toBe("v1");
  });
});
