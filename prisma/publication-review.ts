import { createHash } from "node:crypto";

export type PublicationReviewRecord = {
  status: "pending" | "reviewed";
  reviewer: string | null;
  reviewedAt: string | null;
  sha256: string | null;
  itemCount: number;
};

export type PublicationReviewEvidence = {
  courseId: string;
  version: number;
  assessment: PublicationReviewRecord;
  hints: PublicationReviewRecord;
};

export type PublicationReviewExpectation = {
  courseId: string;
  version: number;
  assessmentSha256: string;
  questionCount: number;
  hintSha256: string;
  hintPackCount: number;
};

export function reviewBundleSha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function assertPublicationReviewEvidence(
  evidence: PublicationReviewEvidence | null,
  expected: PublicationReviewExpectation,
): void {
  if (!evidence) throw new Error("Production publishing requires private assessment and hint review evidence.");
  if (evidence.courseId !== expected.courseId || evidence.version !== expected.version) {
    throw new Error("Publication review evidence must match the exact course ID and version being published.");
  }
  assertReviewedRecord(evidence.assessment, "assessment and answer-key", expected.assessmentSha256, expected.questionCount);
  assertReviewedRecord(evidence.hints, "authored hint", expected.hintSha256, expected.hintPackCount);
}

function assertReviewedRecord(
  record: PublicationReviewRecord,
  label: string,
  expectedSha256: string,
  expectedItemCount: number,
): void {
  if (record.status !== "reviewed") throw new Error(`Production publishing requires reviewed ${label} content.`);
  if (!record.reviewer?.trim() || record.reviewer.trim().length < 2) {
    throw new Error(`Reviewed ${label} content must identify its reviewer.`);
  }
  if (!record.reviewedAt || !Number.isFinite(Date.parse(record.reviewedAt))) {
    throw new Error(`Reviewed ${label} content must include a valid review timestamp.`);
  }
  if (!/^[a-f0-9]{64}$/.test(record.sha256 ?? "") || record.sha256 !== expectedSha256) {
    throw new Error(`Reviewed ${label} evidence is stale; review the current private bundle fingerprint.`);
  }
  if (record.itemCount !== expectedItemCount) {
    throw new Error(`Reviewed ${label} evidence does not cover all ${expectedItemCount} items.`);
  }
}
