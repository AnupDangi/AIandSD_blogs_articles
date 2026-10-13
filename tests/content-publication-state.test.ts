import { describe, expect, it } from "vitest";
import { validatePublicationState } from "../scripts/content-publication-state";

describe("public curriculum publication state", () => {
  const draftLessons = Array.from({ length: 40 }, (_, index) => ({ id: `ai-${index + 1}`, contentStatus: "draft-needs-editorial-review" }));
  const draft = {
    courseStatus: "in-progress",
    publicationStatus: "in-progress",
    readiness: "incomplete-editorial-review",
    lessons: draftLessons,
  };

  it("accepts a reviewed release without requiring private grading data in public validation", () => {
    expect(validatePublicationState({
      courseStatus: "complete",
      publicationStatus: "complete",
      readiness: "ready",
      lessons: Array.from({ length: 40 }, (_, index) => ({ id: `ai-${index + 1}`, contentStatus: "reviewed" })),
    })).toEqual([]);
  });

  it("accepts the explicitly incomplete draft course", () => {
    expect(validatePublicationState(draft)).toEqual([]);
  });

  it("allows partial editorial review while the course remains in progress", () => {
    expect(validatePublicationState({ ...draft, lessons: [
      { id: "ai-1", contentStatus: "reviewed" },
      ...draftLessons.slice(1),
    ] })).toEqual([]);
  });

  it("rejects mismatched release labels instead of implying readiness", () => {
    for (const state of [
      { ...draft, courseStatus: "complete" },
      { ...draft, publicationStatus: "complete" },
      { ...draft, readiness: "ready" },
      { ...draft, courseStatus: "complete", publicationStatus: "complete" },
    ]) {
      expect(validatePublicationState(state)).toContainEqual(expect.stringMatching(/consistently describe/));
    }
  });

  it("rejects a complete course with even one unreviewed lesson", () => {
    expect(validatePublicationState({
      courseStatus: "complete", publicationStatus: "complete", readiness: "ready",
      lessons: draftLessons.map((lesson, index) => ({ ...lesson, contentStatus: index === 39 ? "draft-needs-editorial-review" : "reviewed" })),
    })).toEqual(["ai-40 must be reviewed before the course can be complete and ready."]);
  });

  it("rejects unknown course, manifest, readiness, and lesson states", () => {
    for (const state of [
      { ...draft, courseStatus: "published" },
      { ...draft, publicationStatus: "published" },
      { ...draft, readiness: "approved" },
      { ...draft, lessons: [{ id: "ai-1", contentStatus: "approved" }] },
    ]) {
      expect(validatePublicationState(state).length).toBeGreaterThan(0);
    }
  });
});
