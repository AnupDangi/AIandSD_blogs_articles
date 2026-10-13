import { createHash } from "node:crypto";

type Choice = { id: string; text: string };

/** Stable per-question option ordering without a repeating answer-position cycle. */
export function orderAssessmentChoices<T extends Choice>(questionId: string, choices: readonly T[]): T[] {
  return [...choices].sort((left, right) => {
    const leftRank = createHash("sha256").update(`${questionId}:${left.id}`).digest("hex");
    const rightRank = createHash("sha256").update(`${questionId}:${right.id}`).digest("hex");
    return leftRank.localeCompare(rightRank);
  });
}
