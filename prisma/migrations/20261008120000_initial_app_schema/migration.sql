CREATE SCHEMA IF NOT EXISTS "app";

CREATE TABLE "app"."CourseVersion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."Assessment" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "passPercent" INTEGER NOT NULL DEFAULT 80,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" JSONB NOT NULL,
    "answerKey" JSONB NOT NULL,
    "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "feedback" TEXT,
    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."Enrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."Attempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "assessmentVersion" INTEGER NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "scorePercent" INTEGER,
    "passed" BOOLEAN,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."AttemptResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttemptResponse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."LearningProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'visited',
    "readAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."Project" (
    "id" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id", "courseVersionId")
);

CREATE TABLE "app"."ProjectSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "repositoryUrl" TEXT NOT NULL,
    "commitSha" TEXT,
    "checklist" JSONB NOT NULL,
    "reflection" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."HintPack" (
    "id" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "hints" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HintPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."HintSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "hintPackId" TEXT NOT NULL,
    "lastLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HintSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."TutorRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "taskKey" TEXT NOT NULL,
    "hintPackId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TutorRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app"."AiRequestQuota" (
    "userId" TEXT NOT NULL,
    "utcDay" DATE NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiRequestQuota_pkey" PRIMARY KEY ("userId", "utcDay")
);

CREATE TABLE "app"."AiBudgetPeriod" (
    "month" TEXT NOT NULL,
    "capMicros" INTEGER NOT NULL,
    "reservedMicros" INTEGER NOT NULL DEFAULT 0,
    "spentMicros" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiBudgetPeriod_pkey" PRIMARY KEY ("month")
);

CREATE TABLE "app"."AiUsageReservation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "reservedMicros" INTEGER NOT NULL,
    "actualMicros" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "providerRequestId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reconciledAt" TIMESTAMP(3),
    CONSTRAINT "AiUsageReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseVersion_courseId_version_key" ON "app"."CourseVersion"("courseId", "version");
CREATE INDEX "CourseVersion_courseId_publishedAt_idx" ON "app"."CourseVersion"("courseId", "publishedAt");
CREATE UNIQUE INDEX "Assessment_courseVersionId_key_version_key" ON "app"."Assessment"("courseVersionId", "key", "version");
CREATE INDEX "Assessment_courseVersionId_publishedAt_idx" ON "app"."Assessment"("courseVersionId", "publishedAt");
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_position_key" ON "app"."AssessmentQuestion"("assessmentId", "position");
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_key_key" ON "app"."AssessmentQuestion"("assessmentId", "key");
CREATE INDEX "AssessmentQuestion_assessmentId_idx" ON "app"."AssessmentQuestion"("assessmentId");
CREATE UNIQUE INDEX "Enrollment_userId_courseVersionId_key" ON "app"."Enrollment"("userId", "courseVersionId");
CREATE INDEX "Enrollment_userId_enrolledAt_idx" ON "app"."Enrollment"("userId", "enrolledAt");
CREATE UNIQUE INDEX "Attempt_userId_idempotencyKey_key" ON "app"."Attempt"("userId", "idempotencyKey");
CREATE INDEX "Attempt_userId_startedAt_idx" ON "app"."Attempt"("userId", "startedAt");
CREATE INDEX "Attempt_assessmentId_assessmentVersion_idx" ON "app"."Attempt"("assessmentId", "assessmentVersion");
CREATE UNIQUE INDEX "AttemptResponse_attemptId_questionId_key" ON "app"."AttemptResponse"("attemptId", "questionId");
CREATE INDEX "AttemptResponse_attemptId_idx" ON "app"."AttemptResponse"("attemptId");
CREATE UNIQUE INDEX "LearningProgress_userId_contentType_contentId_key" ON "app"."LearningProgress"("userId", "contentType", "contentId");
CREATE INDEX "LearningProgress_userId_updatedAt_idx" ON "app"."LearningProgress"("userId", "updatedAt");
CREATE INDEX "Project_courseVersionId_publishedAt_idx" ON "app"."Project"("courseVersionId", "publishedAt");
CREATE INDEX "ProjectSubmission_userId_projectId_submittedAt_idx" ON "app"."ProjectSubmission"("userId", "projectId", "submittedAt");
CREATE UNIQUE INDEX "ProjectSubmission_userId_idempotencyKey_key" ON "app"."ProjectSubmission"("userId", "idempotencyKey");
CREATE INDEX "ProjectSubmission_courseVersionId_idx" ON "app"."ProjectSubmission"("courseVersionId");
CREATE UNIQUE INDEX "HintPack_taskKey_version_key" ON "app"."HintPack"("taskKey", "version");
CREATE UNIQUE INDEX "HintSession_userId_taskKey_hintPackId_key" ON "app"."HintSession"("userId", "taskKey", "hintPackId");
CREATE INDEX "HintSession_userId_updatedAt_idx" ON "app"."HintSession"("userId", "updatedAt");
CREATE INDEX "TutorRequest_userId_taskKey_createdAt_idx" ON "app"."TutorRequest"("userId", "taskKey", "createdAt");
CREATE UNIQUE INDEX "TutorRequest_userId_idempotencyKey_key" ON "app"."TutorRequest"("userId", "idempotencyKey");
CREATE INDEX "AiUsageReservation_userId_createdAt_idx" ON "app"."AiUsageReservation"("userId", "createdAt");
CREATE INDEX "AiUsageReservation_status_expiresAt_idx" ON "app"."AiUsageReservation"("status", "expiresAt");

ALTER TABLE "app"."Assessment" ADD CONSTRAINT "Assessment_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "app"."CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "app"."Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app"."Enrollment" ADD CONSTRAINT "Enrollment_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "app"."CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."Attempt" ADD CONSTRAINT "Attempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "app"."Assessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."AttemptResponse" ADD CONSTRAINT "AttemptResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "app"."Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app"."AttemptResponse" ADD CONSTRAINT "AttemptResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "app"."AssessmentQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."Project" ADD CONSTRAINT "Project_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "app"."CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_projectId_courseVersionId_fkey" FOREIGN KEY ("projectId", "courseVersionId") REFERENCES "app"."Project"("id", "courseVersionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."ProjectSubmission" ADD CONSTRAINT "ProjectSubmission_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "app"."CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."HintSession" ADD CONSTRAINT "HintSession_hintPackId_fkey" FOREIGN KEY ("hintPackId") REFERENCES "app"."HintPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."TutorRequest" ADD CONSTRAINT "TutorRequest_hintPackId_fkey" FOREIGN KEY ("hintPackId") REFERENCES "app"."HintPack"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."AiUsageReservation" ADD CONSTRAINT "AiUsageReservation_periodMonth_fkey" FOREIGN KEY ("periodMonth") REFERENCES "app"."AiBudgetPeriod"("month") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Application records are accessed only through server-side Prisma operations.
-- Keep the schema out of Supabase's exposed Data API schemas.
REVOKE ALL ON SCHEMA "app" FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA "app" FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA "app" FROM authenticated';
  END IF;
END
$$;
