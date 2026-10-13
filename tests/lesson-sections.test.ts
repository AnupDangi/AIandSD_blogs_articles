import { describe, expect, it } from "vitest";
import { splitLessonDraft } from "@/content/lesson-sections";

describe("lesson source sections", () => {
  it("splits concepts, worked cases, and practice without dropping source text", () => {
    const source = [
      "# Chapter",
      "## Learning outcomes",
      "Concept and objective.",
      "## Worked example",
      "A complete example.",
      "## Failure modes",
      "A failure case.",
      "## Practice lab",
      "A runnable task.",
      "## Course project — milestone 1",
      "A cumulative milestone.",
    ].join("\n\n");
    const sections = splitLessonDraft(source);
    expect(sections[0]).toContain("Concept and objective.");
    expect(sections[1]).toContain("A complete example.");
    expect(sections[1]).toContain("A failure case.");
    expect(sections[2]).toContain("A runnable task.");
    expect(sections[2]).toContain("A cumulative milestone.");
    expect(sections.join("\n")).toContain("# Chapter");
    for (const phrase of ["Concept and objective.", "A complete example.", "A failure case.", "A runnable task.", "A cumulative milestone."]) {
      expect(sections.join("\n").match(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))).toHaveLength(1);
    }
  });

  it("returns three empty sections when no draft is available", () => {
    expect(splitLessonDraft(null)).toEqual(["", "", ""]);
  });
});
