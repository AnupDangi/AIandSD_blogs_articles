import { describe, expect, it } from "vitest";
import { buildLessonSnapshots } from "../prisma/lesson-snapshot";
import { mapLegacyProgressToVersion, shouldBackfillLegacyProgress } from "../prisma/lesson-progress-backfill";
import type { Lesson } from "../src/content/types";
import type { RetrievalVisualScenario } from "../src/content/visual-scenario-types";

const lesson = {
  id: "ai-01",
  slug: "first-lesson",
  title: "First lesson",
  chapter: 1,
  duration: 20,
  summary: "Summary",
  outcomes: [], prerequisites: [], moduleId: "foundations",
  sourceDraft: "docs/applied-ai/ch01.md",
  contentStatus: "draft-needs-editorial-review",
  formativeQuestionIds: [], assessmentIds: [], activityId: "activity-1", visual: "request-workbench",
  sections: [{ id: "ai-01-intro", title: "Intro", summary: "Start", visual: "request-workbench", activity: "predict", resources: [], hints: [] }],
} satisfies Lesson;

describe("immutable lesson snapshots", () => {
  it("backfills legacy reading only when publishing the first readable course version", () => {
    const publishedAt = new Date();
    expect(shouldBackfillLegacyProgress(0, null)).toBe(false);
    // An unpublished staging version does not count as a readable predecessor.
    expect(shouldBackfillLegacyProgress(0, publishedAt)).toBe(true);
    expect(shouldBackfillLegacyProgress(1, publishedAt)).toBe(false);
  });

  it("captures the exact source, stable section manifest, and content hash", () => {
    const [snapshot] = buildLessonSnapshots([lesson], () => "# First lesson\n\nOriginal prose.");
    expect(snapshot).toMatchObject({
      lessonId: "ai-01",
      slug: "first-lesson",
      contentMarkdown: "# First lesson\n\nOriginal prose.",
      contentSha256: "c9d16d8741106a8c2613c56d965b00e3587e5cf146c19ebdcef6457808cbe5d3",
    });
    expect(snapshot.metadata).toMatchObject(lesson);
    expect(snapshot.metadata.visualScenario?.engine).toBe("request-workbench");
  });

  it("pins lesson-specific public visual fixtures into each immutable version", () => {
    const retrievalLesson: Lesson = {
      ...lesson,
      id: "ai-08",
      visual: "retrieval-microscope",
      sections: [{ ...lesson.sections[0], visual: "retrieval-microscope" }],
    };
    const scenario = (title: string): RetrievalVisualScenario => ({
      engine: "retrieval-microscope", calculationVersion: "v1", title, query: "query", defaultChunkSize: 1, defaultTopK: 1,
      sentences: [{ id: title, text: "evidence", relevant: true }],
    });
    const [versionOne] = buildLessonSnapshots([retrievalLesson], () => "v1 prose", () => scenario("v1"));
    const [versionTwo] = buildLessonSnapshots([retrievalLesson], () => "v2 prose", () => scenario("v2"));

    expect(versionOne.metadata.visualScenario).toEqual(scenario("v1"));
    expect(versionTwo.metadata.visualScenario).toEqual(scenario("v2"));
    expect(versionOne.metadata.visualScenario?.title).toBe("v1");
    expect(buildLessonSnapshots([lesson], () => "prose")[0].metadata.visualScenario?.engine).toBe("request-workbench");
  });

  it("maps only unambiguous lesson and section rows while retaining unmappable legacy rows", () => {
    const result = mapLegacyProgressToVersion([
      { userId: "alice", contentType: "lesson", contentId: "ai-01", state: "completed", readAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02") },
      { userId: "bob", contentType: "section", contentId: "ai-01-intro", state: "visited", readAt: null, updatedAt: new Date("2026-01-03") },
      { userId: "alice", contentType: "section", contentId: "removed-section", state: "completed", readAt: null, updatedAt: new Date("2026-01-04") },
      { userId: "alice", contentType: "topic", contentId: "retrieval", state: "completed", readAt: null, updatedAt: new Date("2026-01-05") },
    ], [lesson], "version-1");

    expect(result.mapped).toEqual([
      { userId: "alice", courseVersionId: "version-1", lessonId: "ai-01", contentType: "lesson", contentId: "ai-01", state: "completed", readAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-02") },
      { userId: "bob", courseVersionId: "version-1", lessonId: "ai-01", contentType: "section", contentId: "ai-01-intro", state: "visited", readAt: null, updatedAt: new Date("2026-01-03") },
    ]);
    expect(result.unmapped).toEqual(["section:removed-section", "topic:retrieval"]);
  });
});
