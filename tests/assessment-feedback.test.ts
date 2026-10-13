import { describe, expect, it } from "vitest";
import { assertFeedbackDoesNotRepeatAnswers, validateAssessmentFeedback, type AssessmentFeedbackBundle } from "@/../prisma/assessment-feedback";
import { collectRemediationFeedback } from "@/lib/assessment-contract";

const questions = [
  { id: "formative-1", kind: "formative" as const },
  { id: "module-1", kind: "module" as const },
  { id: "final-1", kind: "final" as const },
];
const bundle: AssessmentFeedbackBundle = {
  courseId: "applied-ai",
  version: 1,
  entries: [
    { questionId: "formative-1", text: "Compare the observed result with the expected boundary before retrying this step." },
    { questionId: "module-1", text: "A retry decision should be based on the failure class and the remaining deadline." },
    { questionId: "final-1", text: "Compare the affected slice separately so an aggregate measure cannot hide a regression." },
  ],
};

describe("protected assessment feedback", () => {
  it("requires exact coverage of formative, module, and final questions", () => {
    expect(validateAssessmentFeedback(questions, [bundle], "applied-ai", 1)).toEqual(new Map([
      ["formative-1", bundle.entries[0].text],
      ["module-1", bundle.entries[1].text],
      ["final-1", bundle.entries[2].text],
    ]));
    expect(() => validateAssessmentFeedback(questions, [{ ...bundle, entries: bundle.entries.slice(1) }], "applied-ai", 1)).toThrow(/every question/);
    expect(() => validateAssessmentFeedback(questions, [{ ...bundle, entries: [...bundle.entries, { questionId: "unknown", text: "This extra text is longer than the minimum length." }] }], "applied-ai", 1)).toThrow(/every question/);
  });

  it("rejects duplicate IDs and feedback from another course version", () => {
    expect(() => validateAssessmentFeedback(questions, [{ ...bundle, entries: [...bundle.entries, bundle.entries[0]] }], "applied-ai", 1)).toThrow(/duplicate/);
    expect(() => validateAssessmentFeedback(questions, [bundle], "another-course", 2)).toThrow(/match the published course and version/);
  });

  it("rejects feedback that repeats the keyed option verbatim", () => {
    const source = [{ id: "formative-1", choices: [{ id: "a", text: "Compare the observed result with the expected boundary" }, { id: "b", text: "Try again" }] }];
    const keys = new Map([["formative-1", "a"]]);
    expect(() => assertFeedbackDoesNotRepeatAnswers(source, keys, new Map([["formative-1", "Compare the observed result with the expected boundary before retrying."]]))).toThrow(/repeats a keyed answer phrase/);
    expect(() => assertFeedbackDoesNotRepeatAnswers(source, keys, new Map([["formative-1", "Inspect which stage failed and record the boundary's expected behavior."]]))).not.toThrow();
  });

  it("rejects long exact fragments of keyed options in remediation", () => {
    const source = [{ id: "formative-1", choices: [{ id: "a", text: "Compare the observed result with the expected boundary before retrying" }, { id: "b", text: "Try another prompt" }] }];
    const keys = new Map([["formative-1", "a"]]);
    expect(() => assertFeedbackDoesNotRepeatAnswers(
      source,
      keys,
      new Map([["formative-1", "A useful first step is to compare the observed result with the expected boundary before selecting another action."]]),
    )).toThrow(/repeats a keyed answer phrase/);
  });

  it("returns conceptual feedback only for incorrect responses and omits question identifiers", () => {
    const result = collectRemediationFeedback([
      { correct: false, topicTags: ["ai-37"], feedback: "Classify failures before deciding which work can be retried." },
      { correct: true, topicTags: ["ai-37"], feedback: "A correct response should not appear in remediation." },
      { correct: false, topicTags: ["ai-37"], feedback: "Classify failures before deciding which work can be retried." },
      { correct: false, topicTags: ["bad topic!"], feedback: "Ignore malformed topic identifiers." },
    ]);
    expect(result).toEqual([{
      topicId: "ai-37",
      text: "Classify failures before deciding which work can be retried.",
    }]);
    expect(JSON.stringify(result)).not.toContain("questionId");
    expect(JSON.stringify(result)).not.toContain("correct");
  });
});
