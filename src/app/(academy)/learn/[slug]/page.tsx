import { notFound, redirect } from "next/navigation";
import { getLesson, lessons, questions as currentQuestions } from "@/content/catalog";
import type { Course, Lesson, PublicQuestion } from "@/content/types";
import { LessonWorkspace } from "@/components/lesson-workspace";
import { SourceDraftReader } from "@/components/source-draft-reader";
import { loadPublicLessonDraft, splitLessonDraft } from "./source";
import { getFormativeQuestions } from "@/content/lesson-questions";
import { getDatabase } from "@/lib/server/db";
import { parseQuestionSnapshots } from "@/lib/assessment-contract";
import resourceManifest from "../../../../../curriculum/resources.json";

export function generateStaticParams() { return [...lessons.map((lesson) => ({ slug: lesson.slug })), { slug: "attention" }]; }

export default async function LessonPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ version?: string | string[] }> }) {
  const { slug } = await params;
  const { version: versionValue } = await searchParams;
  const requestedVersion = versionValue === undefined ? undefined : Array.isArray(versionValue) ? Number.NaN : Number(versionValue);
  if (versionValue !== undefined && (!Number.isSafeInteger(requestedVersion) || (requestedVersion ?? 0) < 1)) notFound();

  let lesson: Lesson | undefined;
  let sourceMarkdown: string | null;
  let pageQuestions: PublicQuestion[] = [];
  let archivedCourse: Course | null = null;
  let archivedLessons: Lesson[] | null = null;
  let archivedResources: typeof resourceManifest | null = null;
  if (requestedVersion !== undefined) {
    const database = getDatabase();
    if (!database) notFound();
    let snapshot;
    try {
      snapshot = await database.lessonSnapshot.findFirst({
        where: { slug, courseVersion: { courseId: "applied-ai", version: requestedVersion, publishedAt: { not: null } } },
        select: {
          metadata: true,
          contentMarkdown: true,
          courseVersion: { select: { id: true, version: true, courseSnapshot: true, resourceSnapshot: true, lessons: { orderBy: { chapter: "asc" }, select: { metadata: true } } } },
        },
      });
    } catch {
      notFound();
    }
    if (!snapshot) notFound();
    lesson = snapshot.metadata as unknown as Lesson;
    sourceMarkdown = snapshot.contentMarkdown;
    archivedCourse = snapshot.courseVersion.courseSnapshot as unknown as Course | null;
    archivedLessons = snapshot.courseVersion.lessons.map(({ metadata }) => metadata as unknown as Lesson);
    archivedResources = snapshot.courseVersion.resourceSnapshot as unknown as typeof resourceManifest | null;
    if (!archivedCourse || !archivedLessons.length || !archivedResources) notFound();
    const formative = await database.assessment.findFirst({
      where: { key: `${lesson.id}-formative`, courseVersionId: snapshot.courseVersion.id, publishedAt: { not: null } },
      include: { questions: { orderBy: { position: "asc" }, select: { key: true, position: true, prompt: true } } },
    });
    const publishedQuestions = formative ? parseQuestionSnapshots(formative.questions) : null;
    pageQuestions = (publishedQuestions ?? []).map((question) => ({
      id: question.key,
      prompt: question.prompt.prompt,
      choices: question.prompt.choices,
      lessonId: lesson!.id,
      assessmentId: `${lesson!.id}-formative`,
      kind: "formative",
    }));
  } else {
    lesson = getLesson(slug) ?? (slug === "attention" ? lessons.find((item) => item.id === "ai-03") : undefined);
    sourceMarkdown = lesson ? await loadPublicLessonDraft(lesson.sourceDraft) : null;
    pageQuestions = lesson ? getFormativeQuestions(lesson, currentQuestions) : [];
    const database = getDatabase();
    if (lesson && database) {
      let latest = null;
      try {
        latest = await database.courseVersion.findFirst({
          where: { courseId: "applied-ai", publishedAt: { not: null }, lessons: { some: { slug } } },
          orderBy: { version: "desc" },
          select: { version: true },
        });
      } catch {
        // Public reading stays available when learner storage is temporarily unavailable.
      }
      if (latest) redirect(`/learn/${slug}?version=${latest.version}`);
    }
  }
  if (!lesson) notFound();
  const sourceSections = splitLessonDraft(sourceMarkdown).map((markdown, index) => <SourceDraftReader key={`${lesson.id}-source-${index}`} markdown={markdown} sourcePath={lesson.sourceDraft.split("/").at(-1) ?? "chapter.md"} reviewed={lesson.contentStatus === "reviewed"} showHeading={index === 0} showEditorialNote={index === 0} />);
  return <LessonWorkspace lesson={lesson} questions={pageQuestions} sourceSections={sourceSections} courseVersion={requestedVersion === undefined ? null : { courseId: "applied-ai", version: requestedVersion }} courseSnapshot={archivedCourse} lessonSnapshots={archivedLessons} resourceSnapshot={archivedResources} />;
}
