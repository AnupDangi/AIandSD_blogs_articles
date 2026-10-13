import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, badRequest, noStoreJson, readJson, rejectCrossOrigin, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { courses, lessons } from "@/content/catalog";

const progressInput = z.object({
  contentType: z.enum(["lesson", "section", "topic"]),
  contentId: z.string().trim().min(1).max(180),
  state: z.enum(["visited", "completed"]),
  courseVersion: z.object({ courseId: z.literal("applied-ai"), version: z.number().int().positive(), lessonId: z.string().min(1).max(180) }).optional(),
});

function hasPublishedContentReference(contentType: string, contentId: string) {
  if (contentType === "lesson") return lessons.some((lesson) => lesson.id === contentId);
  if (contentType === "section") return lessons.some((lesson) => lesson.sections.some((section) => section.id === contentId));
  return courses.some((course) => course.id === contentId || course.topic.toLowerCase().replaceAll(" ", "-") === contentId);
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;

  const database = getDatabase();
  if (!database) return setupRequired();
  const parsed = progressInput.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();

  if (parsed.data.courseVersion) {
    if (parsed.data.contentType === "topic") return badRequest();
    const snapshot = await database.lessonSnapshot.findFirst({
      where: {
        lessonId: parsed.data.courseVersion.lessonId,
        courseVersion: { courseId: parsed.data.courseVersion.courseId, version: parsed.data.courseVersion.version, publishedAt: { not: null } },
      },
      select: { courseVersionId: true, lessonId: true, metadata: true },
    });
    if (!snapshot) return NextResponse.json({ error: "content_not_found" }, { status: 404 });
    const metadata = snapshot.metadata as { sections?: Array<{ id?: unknown }> };
    const validReference = parsed.data.contentType === "lesson"
      ? parsed.data.contentId === snapshot.lessonId
      : Array.isArray(metadata.sections) && metadata.sections.some((section) => typeof section === "object" && section !== null && section.id === parsed.data.contentId);
    if (!validReference) return NextResponse.json({ error: "content_not_found" }, { status: 404 });

    const unique = {
      userId_courseVersionId_contentType_contentId: {
        userId: auth.user.id,
        courseVersionId: snapshot.courseVersionId,
        contentType: parsed.data.contentType,
        contentId: parsed.data.contentId,
      },
    };
    const now = new Date();
    const progress = await database.versionedLearningProgress.upsert({
      where: unique,
      create: {
        userId: auth.user.id,
        courseVersionId: snapshot.courseVersionId,
        lessonId: snapshot.lessonId,
        contentType: parsed.data.contentType,
        contentId: parsed.data.contentId,
        state: parsed.data.state,
        ...(parsed.data.state === "completed" ? { readAt: now } : {}),
      },
      update: parsed.data.state === "completed"
        ? { state: "completed", readAt: now }
        : { updatedAt: now },
      select: { contentType: true, contentId: true, state: true, readAt: true, updatedAt: true, courseVersionId: true },
    });
    return noStoreJson({ progress });
  }

  if (!hasPublishedContentReference(parsed.data.contentType, parsed.data.contentId)) {
    return NextResponse.json({ error: "content_not_found" }, { status: 404 });
  }

  const now = new Date();
  const where = {
    userId_contentType_contentId: {
      userId: auth.user.id,
      contentType: parsed.data.contentType,
      contentId: parsed.data.contentId,
    },
  };
  let progress;
  if (parsed.data.state === "completed") {
    progress = await database.learningProgress.upsert({
      where,
      create: { ...parsed.data, userId: auth.user.id, readAt: now },
      update: { state: "completed", readAt: now },
      select: { contentType: true, contentId: true, state: true, readAt: true, updatedAt: true },
    });
  } else {
    progress = await database.learningProgress.upsert({
      where,
      create: { ...parsed.data, userId: auth.user.id },
      // A visit updates resume ordering while leaving a completed state intact.
      update: { updatedAt: now },
      select: { contentType: true, contentId: true, state: true, readAt: true, updatedAt: true },
    });
  }

  return noStoreJson({ progress });
}
