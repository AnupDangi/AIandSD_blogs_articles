import { describe, expect, it } from "vitest";
import { courses, lessons } from "@/content/catalog";
import { searchContent } from "@/content/search";
import { topics } from "@/content/topics";
import {
  canonicalTopicIds,
  getCanonicalTopic,
  lessonCanonicalTopicIds,
  roadmapCanonicalTopicIds,
  taxonomy,
} from "@/content/topic-taxonomy";

const roadmapFixture: Record<string, readonly string[]> = {
  "system-design": ["topic-serving-reliability", "topic-observability", "topic-production-operations"],
  cloud: ["topic-serving-reliability", "topic-observability", "topic-production-operations"],
  sprint: [
    "topic-decoding-control",
    "topic-retrieval-evaluation",
    "topic-agent-reliability",
    "topic-evaluation-judges",
    "topic-cost-efficiency",
    "topic-serving-reliability",
    "topic-trust-safety",
    "topic-observability",
    "topic-production-operations",
  ],
};

describe("topic taxonomy", () => {
  it("maps every lesson to an existing canonical topic", () => {
    for (const lesson of lessons) {
      const topicId = lessonCanonicalTopicIds[lesson.id];
      expect(topicId, `${lesson.id} has no canonical topic`).toBeDefined();
      expect(getCanonicalTopic(topicId!), `${lesson.id} maps to unknown topic`).toBeDefined();
    }
  });

  it("gives every canonical topic at least one mapped lesson", () => {
    for (const topicId of canonicalTopicIds) {
      const mapped = lessons.filter((lesson) => lessonCanonicalTopicIds[lesson.id] === topicId);
      expect(mapped.length, `${topicId} has no lesson`).toBeGreaterThan(0);
    }
  });

  it("keeps roadmap mappings matched to the outline fixture", () => {
    expect(roadmapCanonicalTopicIds).toEqual(roadmapFixture);
    const roadmapCourses = courses.filter((course) => course.status === "roadmap");
    expect(roadmapCourses.map((course) => course.id).sort()).toEqual(Object.keys(roadmapFixture).sort());
    for (const course of roadmapCourses) {
      for (const topicId of roadmapCanonicalTopicIds[course.id] ?? []) {
        expect(getCanonicalTopic(topicId), `${course.id} claims unknown topic ${topicId}`).toBeDefined();
      }
    }
  });

  it("never labels an entry reviewed unless its content is reviewed", () => {
    const reviewedStatuses = new Set(lessons.filter((lesson) => lesson.contentStatus === "reviewed").map((lesson) => lesson.id));
    expect(reviewedStatuses.size).toBe(0);
    for (const topic of topics) {
      const text = [topic.title, topic.description, ...topic.tags].join(" ").toLowerCase();
      expect(/\breviewed\b/.test(text), `"${text}" claims review`).toBe(false);
    }
    for (const canonical of taxonomy) {
      const text = `${canonical.label} ${canonical.summary}`.toLowerCase();
      expect(/\breviewed\b/.test(text), `"${text}" claims review`).toBe(false);
    }
  });

  it("groups the topics array for the directory without dropping entries", () => {
    const lessonEntries = topics.filter((topic) => topic.lessonSlug);
    const roadmapEntries = topics.filter((topic) => !topic.lessonSlug);
    expect(lessonEntries).toHaveLength(lessons.length);
    expect(roadmapEntries).toHaveLength(courses.length - 1);
    const grouped = canonicalTopicIds.flatMap((topicId) =>
      lessonEntries.filter((topic) => topic.canonicalTopicId === topicId),
    );
    expect(grouped).toHaveLength(lessonEntries.length);
    for (const topic of lessonEntries) {
      expect((canonicalTopicIds as readonly string[]).includes(topic.canonicalTopicId!)).toBe(true);
    }
  });

  it("still surfaces topics and roadmap entries through search", () => {
    expect(searchContent("retrieval evaluation", 50).some((result) => result.kind === "Topic")).toBe(true);
    for (const course of courses.filter((entry) => entry.id !== "applied-ai")) {
      expect(searchContent(course.title, 50).some((result) => result.kind === "Course" && result.href === `/courses/${course.slug}`)).toBe(true);
    }
  });
});
