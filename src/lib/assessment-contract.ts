import { z } from "zod";

const choiceSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: z.string().trim().min(1).max(4000),
}).strict();

const questionSchema = z.object({
  key: z.string().trim().min(1).max(120),
  position: z.number().int().nonnegative(),
  prompt: z.object({
    prompt: z.string().trim().min(1).max(5000),
    choices: z.array(choiceSchema).min(2).max(8),
  }).strict(),
}).strict();

export type SnapshotQuestion = z.infer<typeof questionSchema>;

/** Keep the published question text and choices pinned to the assessment version in Postgres. */
export function parseQuestionSnapshots(value: unknown): SnapshotQuestion[] | null {
  const result = z.array(questionSchema).min(1).safeParse(value);
  if (!result.success) return null;
  const questions = result.data;
  if (new Set(questions.map((question) => question.key)).size !== questions.length) return null;
  if (questions.some((question) => new Set(question.prompt.choices.map((choice) => choice.id)).size !== question.prompt.choices.length)) return null;
  return questions;
}

const topicIdPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;

/** Aggregate weak topics without exposing which individual questions were missed. */
export function collectRemediationTopics(responses: readonly { correct: boolean; topicTags: readonly string[] }[]): string[] {
  return [...new Set(responses.filter((response) => !response.correct).flatMap((response) => response.topicTags).filter((topic) => topicIdPattern.test(topic)))].sort();
}

/** Return authored conceptual feedback only for missed items, without question or answer identifiers. */
export function collectRemediationFeedback(
  responses: readonly { correct: boolean; topicTags: readonly string[]; feedback?: string | null }[],
): Array<{ topicId: string; text: string }> {
  const feedback = new Map<string, { topicId: string; text: string }>();
  for (const response of responses) {
    const text = response.feedback?.trim();
    if (response.correct || !text) continue;
    for (const topicId of response.topicTags) {
      if (!topicIdPattern.test(topicId)) continue;
      feedback.set(`${topicId}\u0000${text}`, { topicId, text });
    }
  }
  return [...feedback.values()].sort((left, right) => left.topicId.localeCompare(right.topicId) || left.text.localeCompare(right.text));
}
