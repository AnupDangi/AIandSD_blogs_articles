CREATE TABLE "app"."Profile" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "app"."Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Bookmark_userId_lessonId_sectionId_key" ON "app"."Bookmark"("userId", "lessonId", "sectionId");
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "app"."Bookmark"("userId", "createdAt");
