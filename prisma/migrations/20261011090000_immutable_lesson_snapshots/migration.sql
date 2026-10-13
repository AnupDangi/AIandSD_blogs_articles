CREATE TABLE "app"."LessonSnapshot" (
    "id" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "contentSha256" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonSnapshot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "app"."CourseVersion" ADD COLUMN "courseSnapshot" JSONB;
ALTER TABLE "app"."CourseVersion" ADD COLUMN "resourceSnapshot" JSONB;

CREATE TABLE "app"."VersionedLearningProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'visited',
    "readAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VersionedLearningProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonSnapshot_courseVersionId_lessonId_key" ON "app"."LessonSnapshot"("courseVersionId", "lessonId");
CREATE UNIQUE INDEX "LessonSnapshot_courseVersionId_slug_key" ON "app"."LessonSnapshot"("courseVersionId", "slug");
CREATE INDEX "LessonSnapshot_courseVersionId_chapter_idx" ON "app"."LessonSnapshot"("courseVersionId", "chapter");
CREATE UNIQUE INDEX "VersionedLearningProgress_userId_courseVersionId_contentType_contentId_key" ON "app"."VersionedLearningProgress"("userId", "courseVersionId", "contentType", "contentId");
CREATE INDEX "VersionedLearningProgress_userId_updatedAt_idx" ON "app"."VersionedLearningProgress"("userId", "updatedAt");

ALTER TABLE "app"."LessonSnapshot" ADD CONSTRAINT "LessonSnapshot_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "app"."CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."VersionedLearningProgress" ADD CONSTRAINT "VersionedLearningProgress_courseVersionId_lessonId_fkey" FOREIGN KEY ("courseVersionId", "lessonId") REFERENCES "app"."LessonSnapshot"("courseVersionId", "lessonId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "app"."VersionedLearningProgress" ADD CONSTRAINT "VersionedLearningProgress_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "app"."CourseVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
