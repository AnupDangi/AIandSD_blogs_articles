import { describe, expect, it } from "vitest";
import { collectRemediationTopics, parseQuestionSnapshots } from "../src/lib/assessment-contract";
import { courses, questions } from "../src/content/catalog";
import { orderAssessmentChoices } from "../src/lib/assessment-order";

const storedQuestion = {
  key: "ai-01-q1",
  position: 0,
  prompt: {
    prompt: "Which boundary should validate a model response?",
    choices: [{ id: "a", text: "The typed service" }, { id: "b", text: "The browser" }],
  },
};

describe("versioned assessment contract", () => {
  it("uses the stored question wording and choices as the complete view", () => {
    expect(parseQuestionSnapshots([storedQuestion])).toEqual([storedQuestion]);
  });

  it("rejects malformed or solution-bearing prompt data", () => {
    expect(parseQuestionSnapshots([{ ...storedQuestion, answerKey: "a" }])).toBeNull();
    expect(parseQuestionSnapshots([{ ...storedQuestion, prompt: { ...storedQuestion.prompt, choices: [{ id: "a", text: "one" }, { id: "a", text: "two" }] } }])).toBeNull();
    expect(parseQuestionSnapshots([{ ...storedQuestion, prompt: { prompt: "", choices: storedQuestion.prompt.choices } }])).toBeNull();
  });

  it("returns each weak topic once, without question IDs or correctness flags", () => {
    expect(collectRemediationTopics([
      { correct: false, topicTags: ["ai-01", "ai-02"] },
      { correct: true, topicTags: ["ai-03"] },
      { correct: false, topicTags: ["ai-02", "ai-01"] },
    ])).toEqual(["ai-01", "ai-02"]);
  });

  it("keeps final-assessment remediation tied to the exact source lesson", () => {
    const finalQuestions = questions.filter((question) => question.kind === "final");
    const lessonIds = new Set(courses[0].modules.flatMap((courseModule) => courseModule.lessonIds));
    expect(finalQuestions).toHaveLength(30);
    expect(finalQuestions.every((question) => lessonIds.has(question.lessonId))).toBe(true);
    expect(finalQuestions.some((question) => question.lessonId === "ai-37")).toBe(true);
  });

  it("maps a Chapter 37 miss to its exact lesson and efficiency module", () => {
    const course = courses[0];
    const question = questions.find((candidate) => candidate.id === "efficiency-assessment-q10");
    expect(question?.lessonId).toBe("ai-37");
    const courseModule = course.modules.find((candidate) => candidate.lessonIds.includes(question!.lessonId));
    expect(courseModule?.id).toBe("efficiency");
    expect(courseModule?.lessonIds).toContain("ai-37");
  });

  it("uses a stable mixed option order across the complete question bank", () => {
    const positions = questions.map((question) => {
      const ordered = orderAssessmentChoices(question.id, question.choices);
      expect(ordered).toEqual(orderAssessmentChoices(question.id, question.choices));
      return ordered.findIndex((choice) => choice.id === "a");
    });
    expect(positions).toHaveLength(310);
    expect(new Set(positions).size).toBeGreaterThanOrEqual(2);
    expect(positions.slice(0, 12)).not.toEqual(positions.slice(3, 15));
  });
});
