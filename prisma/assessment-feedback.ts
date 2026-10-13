import { z } from "zod";

const entrySchema = z.object({
  questionId: z.string().min(1).max(120),
  text: z.string().trim().min(40).max(1000),
}).strict();

export const assessmentFeedbackBundleSchema = z.object({
  courseId: z.string().trim().min(1).max(120),
  version: z.number().int().positive(),
  entries: z.array(entrySchema).min(1),
}).strict();

export type AssessmentFeedbackBundle = z.infer<typeof assessmentFeedbackBundleSchema>;

/** Require one protected conceptual feedback note for every versioned question. */
export function validateAssessmentFeedback(
  questions: readonly { id: string; kind: "formative" | "module" | "final" }[],
  bundles: readonly AssessmentFeedbackBundle[],
  courseId: string,
  version: number,
): Map<string, string> {
  const feedback = new Map<string, string>();
  for (const bundle of bundles) {
    if (bundle.courseId !== courseId || bundle.version !== version) {
      throw new Error("Private assessment feedback must match the published course and version.");
    }
    for (const entry of bundle.entries) {
      if (feedback.has(entry.questionId)) throw new Error("Private assessment feedback contains duplicate question IDs.");
      feedback.set(entry.questionId, entry.text);
    }
  }

  const questionIds = new Set(questions.map((question) => question.id));
  if (feedback.size !== questionIds.size || [...feedback.keys()].some((questionId) => !questionIds.has(questionId))) {
    throw new Error("Private assessment feedback must cover every question exactly once.");
  }
  return feedback;
}

/** Catch accidental verbatim answer disclosure in protected, post-submit remediation. */
export function assertFeedbackDoesNotRepeatAnswers(
  questions: readonly { id: string; choices: readonly { id: string; text: string }[] }[],
  answerKeys: ReadonlyMap<string, string>,
  feedback: ReadonlyMap<string, string>,
): void {
  const tokens = (value: string) => value.normalize("NFKC").toLocaleLowerCase("en").match(/[\p{L}\p{N}]+/gu) ?? [];
  const containsPhrase = (haystack: readonly string[], needle: readonly string[]) => {
    if (needle.length === 0 || needle.length > haystack.length) return false;
    for (let start = 0; start <= haystack.length - needle.length; start += 1) {
      if (needle.every((token, offset) => haystack[start + offset] === token)) return true;
    }
    return false;
  };
  for (const question of questions) {
    const answer = question.choices.find((choice) => choice.id === answerKeys.get(question.id));
    const note = feedback.get(question.id);
    if (!answer || !note) throw new Error(`Private assessment feedback is missing a keyed item: ${question.id}.`);
    const answerTokens = tokens(answer.text);
    const noteTokens = tokens(note);
    if (answerTokens.length > 0 && containsPhrase(noteTokens, answerTokens)) {
      throw new Error(`Private assessment feedback repeats a keyed answer phrase: ${question.id}.`);
    }
    if (answerTokens.length >= 8) {
      const containsLongAnswerPhrase = Array.from({ length: answerTokens.length - 7 }, (_, start) => answerTokens.slice(start, start + 8))
        .some((phrase) => containsPhrase(noteTokens, phrase));
      if (containsLongAnswerPhrase) {
        throw new Error(`Private assessment feedback repeats a keyed answer phrase: ${question.id}.`);
      }
    }
  }
}
