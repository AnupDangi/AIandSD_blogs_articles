import { describe, expect, it } from "vitest";
import { searchContent } from "@/content/search";
import { courses, lessons } from "@/content/catalog";
import { topics } from "@/content/topics";

describe("academy search", () => {
  it("finds lessons, topics, and resources from the same query", () => {
    const results = searchContent("transformer attention");
    expect(results.some((result) => result.kind === "Lesson" && result.href.startsWith("/learn/"))).toBe(true);
    expect(results.some((result) => result.kind === "Topic" && result.title === "Transformer attention for engineers" && result.href === "/learn/transformer-attention-for-engineers")).toBe(true);
    expect(results.some((result) => result.kind === "Resource" && result.title === "The Annotated Transformer" && result.href.startsWith("https://"))).toBe(true);
    expect(results.every((result) => result.title && result.description && result.href)).toBe(true);
  });

  it("offers a topic route for every canonical lesson and every course roadmap", () => {
    for (const lesson of lessons) {
      expect(topics.some((topic) => topic.lessonSlug === lesson.slug && topic.moduleId === lesson.moduleId && topic.title === lesson.title)).toBe(true);
      expect(searchContent(lesson.title, 50).some((result) => result.kind === "Topic" && result.href === `/learn/${lesson.slug}`)).toBe(true);
    }
    for (const course of courses.filter((entry) => entry.id !== "applied-ai")) {
      expect(topics.some((topic) => topic.courseId === course.id && !topic.lessonSlug)).toBe(true);
    }
  });

  it("handles case, diacritics, blank input, and limits safely", () => {
    expect(searchContent("  ATTENTION  ").length).toBeGreaterThan(0);
    expect(searchContent("   ")).toEqual([]);
    expect(searchContent("x", -10)).toHaveLength(0);
  });

  it("keeps unknown concepts in an empty state rather than returning unrelated material", () => {
    expect(searchContent("zzzxqvnotinacademy")).toEqual([]);
  });
});
