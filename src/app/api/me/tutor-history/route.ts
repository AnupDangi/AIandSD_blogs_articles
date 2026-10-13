import { authenticateRequest, badRequest, noStoreJson, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { lessons } from "@/content/catalog";

const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 50;

function extractHintId(response: unknown) {
  if (!response || typeof response !== "object") return null;
  const hint = (response as { hint?: unknown }).hint;
  if (!hint || typeof hint !== "object") return null;
  const id = (hint as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

// The tutor route stores the section id as taskKey; hint packs are keyed by lesson id.
const sectionLocations = new Map(lessons.flatMap((lesson) =>
  lesson.sections.map((section) => [section.id, {
    lesson: { id: lesson.id, slug: lesson.slug, title: lesson.title },
    section: { id: section.id, title: section.title },
  }] as const),
));

export async function GET(request: Request) {
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();

  const limitParam = new URL(request.url).searchParams.get("limit");
  let limit = DEFAULT_HISTORY_LIMIT;
  if (limitParam !== null) {
    const parsedLimit = Number(limitParam);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_HISTORY_LIMIT) return badRequest();
    limit = parsedLimit;
  }

  const requests = await database.tutorRequest.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, createdAt: true, taskKey: true, hintPackId: true, response: true },
  });

  const history = [];
  for (const record of requests) {
    const hintId = extractHintId(record.response);
    if (!hintId) continue;
    const location = sectionLocations.get(record.taskKey);
    history.push({
      id: record.id,
      createdAt: record.createdAt,
      hintId,
      hintPackId: record.hintPackId,
      taskKey: record.taskKey,
      lesson: location ? location.lesson : null,
      section: location ? location.section : null,
    });
  }
  return noStoreJson({ history });
}
