-- Additive: index the foreign keys flagged by the Supabase performance advisor.
-- Every FK referencing column previously required a full scan on delete or join.

-- CreateIndex
CREATE INDEX "Enrollment_courseVersionId_idx" ON "app"."Enrollment"("courseVersionId");

-- CreateIndex
CREATE INDEX "AttemptResponse_questionId_idx" ON "app"."AttemptResponse"("questionId");

-- CreateIndex
CREATE INDEX "AttemptDraftResponse_questionId_idx" ON "app"."AttemptDraftResponse"("questionId");

-- CreateIndex
CREATE INDEX "ProjectSubmission_projectId_courseVersionId_idx" ON "app"."ProjectSubmission"("projectId", "courseVersionId");

-- CreateIndex
CREATE INDEX "TutorRequest_hintPackId_idx" ON "app"."TutorRequest"("hintPackId");

-- CreateIndex
CREATE INDEX "HintSession_hintPackId_idx" ON "app"."HintSession"("hintPackId");

-- CreateIndex
CREATE INDEX "AiUsageReservation_periodMonth_idx" ON "app"."AiUsageReservation"("periodMonth");
