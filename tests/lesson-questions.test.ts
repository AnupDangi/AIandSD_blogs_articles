import { describe, expect, it } from "vitest";
import { lessons, questions } from "@/content/catalog";
import { getFormativeQuestions } from "@/content/lesson-questions";

describe("lesson formative question selection", () => {
  it("renders exactly the five authored formative items for every lesson", () => {
    for (const lesson of lessons) {
      const selected = getFormativeQuestions(lesson, questions);
      expect(selected.map((question) => question.id)).toEqual(lesson.formativeQuestionIds);
      expect(selected).toHaveLength(5);
      expect(selected.every((question) => question.kind === "formative" && question.lessonId === lesson.id)).toBe(true);
    }
  });
});
