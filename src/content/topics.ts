import { courses, lessons } from "@/content/catalog";
import type { TopicEntry } from "@/content/types";

const flagship = courses.find((course) => course.id === "applied-ai")!;

import { getCanonicalTopic, lessonCanonicalTopicIds, roadmapCanonicalTopicIds } from "./topic-taxonomy";

export const topics: TopicEntry[] = [
  ...lessons.map((lesson): TopicEntry => ({
    title: lesson.title,
    category: flagship.modules.find((module) => module.id === lesson.moduleId)?.title ?? "Applied AI",
    description: lesson.summary,
    tags: lesson.outcomes.slice(0, 2),
    lessonSlug: lesson.slug,
    moduleId: lesson.moduleId,
    courseId: flagship.id,
    canonicalTopicId: lessonCanonicalTopicIds[lesson.id],
  })),
  ...courses.filter((course) => course.id !== flagship.id).map((course): TopicEntry => ({
    title: course.title,
    category: "ROADMAP",
    description: course.description,
    tags: [course.topic, ...(roadmapCanonicalTopicIds[course.id] ?? []).map((topicId) => getCanonicalTopic(topicId)?.label ?? "").filter(Boolean)],
    courseId: course.id,
    canonicalTopicIds: roadmapCanonicalTopicIds[course.id] ?? [],
  })),
];
