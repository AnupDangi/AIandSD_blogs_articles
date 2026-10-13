import { createHash } from "node:crypto";
import type { Lesson } from "../src/content/types";
import { getLessonVisualScenario, lessonScenarioCalculationVersionsSha256 } from "../src/lib/visual-scenarios";
import type { LessonVisualScenario } from "../src/content/visual-scenario-types";

export type LessonSnapshotInput = {
  lessonId: string;
  slug: string;
  title: string;
  chapter: number;
  sourcePath: string;
  contentMarkdown: string;
  contentSha256: string;
  metadata: Lesson & { visualScenarioCalculationVersionsSha256: string };
};

/** Freeze the repository-authored lesson and its stable section/visual manifest for one course version. */
export function buildLessonSnapshots(
  lessons: readonly Lesson[],
  readSource: (path: string) => string,
  scenarioForLesson: (lessonId: string) => LessonVisualScenario | undefined = getLessonVisualScenario,
  calculationVersionsSha256: string = lessonScenarioCalculationVersionsSha256(),
): LessonSnapshotInput[] {
  return lessons.map((lesson) => {
    const contentMarkdown = readSource(lesson.sourceDraft);
    const visualScenario = scenarioForLesson(lesson.id);
    const visualIds = new Set(lesson.sections.map(({ visual }) => visual));
    if (visualScenario && !visualIds.has(visualScenario.engine)) {
      throw new Error(`Lesson ${lesson.id} has a visual scenario for an engine not assigned to its sections.`);
    }
    return {
      lessonId: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      chapter: lesson.chapter,
      sourcePath: lesson.sourceDraft,
      contentMarkdown,
      contentSha256: createHash("sha256").update(contentMarkdown, "utf8").digest("hex"),
      metadata: visualScenario
        ? { ...lesson, visualScenario, visualScenarioCalculationVersionsSha256: calculationVersionsSha256 }
        : { ...lesson, visualScenarioCalculationVersionsSha256: calculationVersionsSha256 },
    };
  });
}
