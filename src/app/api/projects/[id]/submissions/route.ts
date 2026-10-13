import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequest, badRequest, noStoreJson, readJson, rejectCrossOrigin, setupRequired } from "@/lib/server/http";
import { getDatabase } from "@/lib/server/db";
import { hasExactMilestoneChecklist } from "@/content/project-milestones";

const inputSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120),
  courseId: z.string().trim().min(1).max(120),
  courseVersion: z.number().int().positive(),
  repositoryUrl: z.string().trim().url().max(300),
  commitSha: z.string().trim().regex(/^[a-f0-9]{7,64}$/i).optional(),
  checklist: z.array(z.object({ itemId: z.string().trim().min(1).max(120), completed: z.boolean() }).strict()).max(100)
    .refine((items) => new Set(items.map(({ itemId }) => itemId)).size === items.length, "Checklist item IDs must be unique"),
  reflection: z.string().trim().min(10).max(4000),
}).strict();

type RouteContext = { params: Promise<{ id: string }> };

function isAllowedRepository(value: string) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    return url.protocol === "https:" && url.hostname === "github.com" &&
      url.username === "" && url.password === "" && url.search === "" && url.hash === "" &&
      segments.length === 2 && /^[A-Za-z0-9_.-]+$/.test(segments[0]) && /^[A-Za-z0-9_.-]+(?:\.git)?$/.test(segments[1]);
  } catch {
    return false;
  }
}

function normalizeRepositoryUrl(value: string) {
  const url = new URL(value);
  url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

// Checklist entries represent named acceptance criteria, so their input order is not meaningful.
// Sort by stable item ID before storing/comparing, and reject duplicate IDs in the input schema.
function normalizeChecklist(items: Array<{ itemId: string; completed: boolean }>) {
  return [...items].sort((a, b) => a.itemId.localeCompare(b.itemId));
}

function checklistMatches(value: unknown, expected: Array<{ itemId: string; completed: boolean }>) {
  if (!Array.isArray(value) || value.length !== expected.length) return false;
  const actual = value as Array<{ itemId?: unknown; completed?: unknown }>;
  if (!actual.every((item) => item && typeof item.itemId === "string" && typeof item.completed === "boolean")) return false;
  return JSON.stringify(normalizeChecklist(actual as Array<{ itemId: string; completed: boolean }>)) === JSON.stringify(expected);
}

function sameSubmission(existing: {
  projectId: string;
  courseVersion: { courseId: string; version: number };
  repositoryUrl: string;
  commitSha: string | null;
  checklist: unknown;
  reflection: string;
}, projectId: string, input: z.infer<typeof inputSchema>, repositoryUrl: string, checklist: Array<{ itemId: string; completed: boolean }>) {
  return existing.projectId === projectId &&
    existing.courseVersion.courseId === input.courseId &&
    existing.courseVersion.version === input.courseVersion &&
    normalizeRepositoryUrl(existing.repositoryUrl) === repositoryUrl &&
    (existing.commitSha?.toLowerCase() ?? null) === (input.commitSha?.toLowerCase() ?? null) &&
    existing.reflection === input.reflection &&
    checklistMatches(existing.checklist, checklist);
}

export async function POST(request: Request, context: RouteContext) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const auth = await authenticateRequest();
  if (!auth.user) return auth.response;
  const database = getDatabase();
  if (!database) return setupRequired();
  const { id: projectId } = await context.params;
  const parsed = inputSchema.safeParse(await readJson(request));
  if (!parsed.success || !isAllowedRepository(parsed.data.repositoryUrl)) return badRequest();
  const repositoryUrl = normalizeRepositoryUrl(parsed.data.repositoryUrl);
  const checklist = normalizeChecklist(parsed.data.checklist);

  const existing = await database.projectSubmission.findUnique({
    where: { userId_idempotencyKey: { userId: auth.user.id, idempotencyKey: parsed.data.idempotencyKey } },
    select: { id: true, projectId: true, courseVersion: { select: { courseId: true, version: true } }, repositoryUrl: true, commitSha: true, checklist: true, reflection: true, submittedAt: true },
  });
  if (existing) {
    if (!sameSubmission(existing, projectId, parsed.data, repositoryUrl, checklist)) return NextResponse.json({ error: "idempotency_key_conflict" }, { status: 409 });
    return noStoreJson({ submission: { ...existing, status: "submitted—self-reported" } });
  }

  const project = await database.project.findFirst({
    where: { id: projectId, publishedAt: { not: null }, courseVersion: { courseId: parsed.data.courseId, version: parsed.data.courseVersion, publishedAt: { not: null } } },
    select: { id: true, courseVersionId: true },
  });
  if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  if (!hasExactMilestoneChecklist(project.id, checklist)) {
    return badRequest("Submit the published checklist items for this project milestone.");
  }

  try {
    const submission = await database.projectSubmission.create({
      data: {
        userId: auth.user.id,
        projectId: project.id,
        courseVersionId: project.courseVersionId,
        idempotencyKey: parsed.data.idempotencyKey,
        repositoryUrl,
        commitSha: parsed.data.commitSha?.toLowerCase(),
        checklist,
        reflection: parsed.data.reflection,
      },
      select: { id: true, projectId: true, courseVersion: { select: { courseId: true, version: true } }, repositoryUrl: true, commitSha: true, checklist: true, reflection: true, submittedAt: true },
    });
    return noStoreJson({ submission: { ...submission, status: "submitted—self-reported" } }, { status: 201 });
  } catch {
    const raced = await database.projectSubmission.findUnique({
      where: { userId_idempotencyKey: { userId: auth.user.id, idempotencyKey: parsed.data.idempotencyKey } },
      select: { id: true, projectId: true, courseVersion: { select: { courseId: true, version: true } }, repositoryUrl: true, commitSha: true, checklist: true, reflection: true, submittedAt: true },
    });
    if (raced && sameSubmission(raced, projectId, parsed.data, repositoryUrl, checklist)) return noStoreJson({ submission: { ...raced, status: "submitted—self-reported" } });
    return NextResponse.json({ error: "submission_conflict" }, { status: 409 });
  }
}
