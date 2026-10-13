import type { Lesson, PublicQuestion } from "@/content/types";

/** Return only the five formative questions authored for this lesson, in manifest order. */
export function getFormativeQuestions(lesson: Lesson, questions: PublicQuestion[]): PublicQuestion[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return lesson.formativeQuestionIds.flatMap((id) => {
    const question = byId.get(id);
    return question?.kind === "formative" && question.lessonId === lesson.id ? [question] : [];
  });
}
