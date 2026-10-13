import { describe, expect, it } from "vitest";
import { assertPublicationReviewEvidence, type PublicationReviewEvidence } from "@/../prisma/publication-review";

const evidence: PublicationReviewEvidence = {
  courseId: "applied-ai",
  version: 1,
  assessment: { status: "reviewed", reviewer: "Independent reviewer", reviewedAt: "2026-10-09T08:00:00.000Z", sha256: "a".repeat(64), itemCount: 310 },
  hints: { status: "reviewed", reviewer: "Independent reviewer", reviewedAt: "2026-10-09T08:00:00.000Z", sha256: "b".repeat(64), itemCount: 40 },
};

const expected = {
  courseId: "applied-ai",
  version: 1,
  assessmentSha256: "a".repeat(64),
  questionCount: 310,
  hintSha256: "b".repeat(64),
  hintPackCount: 40,
};

describe("production curriculum review evidence", () => {
  it("accepts reviewed assessments and hints bound to this exact course version", () => {
    expect(() => assertPublicationReviewEvidence(evidence, expected)).not.toThrow();
  });

  it.each([
    ["missing evidence", null],
    ["pending answer-key review", { ...evidence, assessment: { ...evidence.assessment, status: "pending" as const } }],
    ["pending hint review", { ...evidence, hints: { ...evidence.hints, status: "pending" as const } }],
    ["stale question fingerprint", { ...evidence, assessment: { ...evidence.assessment, sha256: "c".repeat(64) } }],
    ["stale hint fingerprint", { ...evidence, hints: { ...evidence.hints, sha256: "d".repeat(64) } }],
    ["different course version", { ...evidence, version: 2 }],
    ["incomplete question review", { ...evidence, assessment: { ...evidence.assessment, itemCount: 309 } }],
    ["incomplete hint review", { ...evidence, hints: { ...evidence.hints, itemCount: 39 } }],
    ["review without a reviewer", { ...evidence, assessment: { ...evidence.assessment, reviewer: " " } }],
  ])("rejects %s", (_label, review) => {
    expect(() => assertPublicationReviewEvidence(review as PublicationReviewEvidence | null, expected)).toThrow();
  });
});
