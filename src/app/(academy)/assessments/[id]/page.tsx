import { notFound } from "next/navigation";
import { lessons } from "@/content/catalog";
import { AssessmentRunner } from "@/components/assessment-runner";
import { getDatabase } from "@/lib/server/db";

const publicAssessmentIds = [...new Set(lessons.flatMap((lesson) => lesson.assessmentIds))];

export function generateStaticParams() {
  return publicAssessmentIds.map((id) => ({ id }));
}

export default async function AssessmentPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attemptId?: string | string[]; version?: string | string[] }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const courseVersion = typeof query.version === "string" && /^[1-9]\d*$/.test(query.version) && Number.isSafeInteger(Number(query.version)) ? Number(query.version) : undefined;
  if (query.version !== undefined && courseVersion === undefined) notFound();
  if (!publicAssessmentIds.includes(id)) {
    if (courseVersion === undefined) notFound();
    const database = getDatabase();
    if (!database) notFound();
    const published = await database.assessment.findFirst({
      where: { key: id, publishedAt: { not: null }, courseVersion: { courseId: "applied-ai", version: courseVersion, publishedAt: { not: null } } },
      select: { id: true },
    }).catch(() => null);
    if (!published) notFound();
  }
  const resumeAttemptId = typeof query.attemptId === "string" && query.attemptId.length <= 120 ? query.attemptId : undefined;
  return <AssessmentRunner assessmentId={id} courseId="applied-ai" courseVersion={courseVersion} resumeAttemptId={resumeAttemptId} />;
}
