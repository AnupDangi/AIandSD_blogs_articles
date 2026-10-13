import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, badRequest, noStoreJson, readJson, rejectCrossOrigin, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";

const bookmarkInput = z.object({
  courseId: z.string().trim().min(1).max(80),
  lessonId: z.string().trim().min(1).max(80),
  sectionId: z.string().trim().max(100).optional(),
});

const bookmarkRemovalInput = z.object({
  lessonId: z.string().trim().min(1).max(80),
  sectionId: z.string().trim().max(100).optional(),
});

const bookmarkShape = { select: { id: true, courseId: true, lessonId: true, sectionId: true, createdAt: true } } as const;

export async function GET() {
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();

  const bookmarks = await database.bookmark.findMany({
    where: { userId: auth.user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...bookmarkShape,
  });
  return noStoreJson({ bookmarks });
}

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const parsed = bookmarkInput.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();

  const sectionId = parsed.data.sectionId ?? "";
  const bookmark = await database.bookmark.upsert({
    where: {
      userId_lessonId_sectionId: { userId: auth.user.id, lessonId: parsed.data.lessonId, sectionId },
    },
    create: { userId: auth.user.id, courseId: parsed.data.courseId, lessonId: parsed.data.lessonId, sectionId },
    update: { courseId: parsed.data.courseId },
    ...bookmarkShape,
  });
  return noStoreJson({ bookmark });
}

export async function DELETE(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const parsed = bookmarkRemovalInput.safeParse(await readJson(request));
  if (!parsed.success) return badRequest();

  const removed = await database.bookmark.deleteMany({
    where: { userId: auth.user.id, lessonId: parsed.data.lessonId, sectionId: parsed.data.sectionId ?? "" },
  });
  if (removed.count === 0) return NextResponse.json({ error: "bookmark_not_found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
