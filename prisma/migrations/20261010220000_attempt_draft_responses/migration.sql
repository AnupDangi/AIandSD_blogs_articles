CREATE TABLE "app"."AttemptDraftResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AttemptDraftResponse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttemptDraftResponse_attemptId_questionId_key" ON "app"."AttemptDraftResponse"("attemptId", "questionId");
CREATE INDEX "AttemptDraftResponse_attemptId_idx" ON "app"."AttemptDraftResponse"("attemptId");

ALTER TABLE "app"."AttemptDraftResponse" ADD CONSTRAINT "AttemptDraftResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "app"."Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app"."AttemptDraftResponse" ADD CONSTRAINT "AttemptDraftResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "app"."AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
