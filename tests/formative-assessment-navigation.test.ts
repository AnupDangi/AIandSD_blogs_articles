import { describe, expect, it } from "vitest";
import { lessons, questions } from "@/content/catalog";
import { generateStaticParams } from "../src/app/(academy)/assessments/[id]/page";

describe("saved formative knowledge checks", () => {
  it("exposes a route for every lesson's five-question assessment", () => {
    const routeIds = new Set(generateStaticParams().map(({ id }) => id));
    for (const lesson of lessons) {
      const id = `${lesson.id}-formative`;
      expect(lesson.assessmentIds).toContain(id);
      expect(routeIds.has(id)).toBe(true);
      expect(questions.filter((question) => question.assessmentId === id).map((question) => question.id)).toEqual(lesson.formativeQuestionIds);
    }
    expect([...routeIds].filter((id) => id.endsWith("-formative"))).toHaveLength(40);
  });
});
