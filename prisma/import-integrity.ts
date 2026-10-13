type FormativeQuestion = { id: string; choiceIds: string[] };
type PrivateKey = { questionId: string; correctChoiceId: string };

/** Validate answer-label distribution without emitting or returning any answer data. */
export function validateFormativeAnswerPattern(
  questions: FormativeQuestion[],
  keys: PrivateKey[],
): void {
  if (questions.length !== 200) throw new Error("The private formative-key integrity check requires exactly 200 questions.");
  const keysById = new Map<string, string>();
  for (const key of keys) {
    if (keysById.has(key.questionId)) throw new Error("The private formative-key integrity check found duplicate question keys.");
    keysById.set(key.questionId, key.correctChoiceId);
  }

  const labels: string[] = [];
  for (const question of questions) {
    const correctChoiceId = keysById.get(question.id);
    if (!correctChoiceId || !question.choiceIds.includes(correctChoiceId)) {
      throw new Error("The private formative-key integrity check found a missing or invalid answer key.");
    }
    if (!(correctChoiceId === "a" || correctChoiceId === "b" || correctChoiceId === "c")) {
      throw new Error("The private formative-key integrity check requires answer labels a, b, and c.");
    }
    labels.push(correctChoiceId);
  }
  if (keysById.size !== questions.length) throw new Error("The private formative-key integrity check found keys outside the formative question set.");

  const counts = { a: 0, b: 0, c: 0 };
  for (const label of labels) counts[label as keyof typeof counts] += 1;
  if (Object.values(counts).some((count) => count < 66 || count > 67)) {
    throw new Error("The private formative-key integrity check requires balanced a/b/c answer-label counts.");
  }
  if (labels.some((label, index) => index >= 3 && label === labels[index - 3])) {
    throw new Error("The private formative-key integrity check rejects answer-label repetition with period three.");
  }
}
