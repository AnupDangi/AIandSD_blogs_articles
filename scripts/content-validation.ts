import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { lessons, questions, courses } from "../src/content/catalog";
import type { PublicQuestion } from "../src/content/types";
import { validatePublicationState } from "./content-publication-state";

const root = process.cwd();
const resources = JSON.parse(readFileSync(resolve(root, "curriculum/resources.json"), "utf8")) as { id: string; title: string; provider: string; type: string; url: string; purpose: string; section: string; relevantSection: string; durationMinutes: number | null; timestamp: string | null; lessonIds: string[]; verifiedOn: string | null; verificationStatus: string }[];
const curriculum = JSON.parse(readFileSync(resolve(root, "curriculum/applied-ai-course.json"), "utf8")) as {
  modules: { id: string; assessmentId: string; questionIds: string[]; chapterRange: string }[];
  finalAssessment: { id: string; questionIds: string[]; passThreshold: number };
  publicationStatus: string;
  readiness: string;
};

const errors: string[] = [];
const fail = (message: string) => errors.push(message);
const unique = <T>(items: T[]) => new Set(items).size === items.length;
const resourcesById = new Map(resources.map((resource) => [resource.id, resource]));
const resourceUrls = new Set(resources.map(({ url }) => url));
const recognizedCorrectionUtilities = new Set(["https://github.com/AnupDangi/learnlikeadev/issues/new"]);
const lessonIds = new Set(lessons.map(({ id }) => id));

if (lessons.length !== 40) fail(`Expected 40 lessons; found ${lessons.length}.`);
if (questions.length !== 310) fail(`Expected 310 public questions; found ${questions.length}.`);
if (!unique(lessons.map(({ id }) => id))) fail("Lesson IDs must be unique.");
if (!unique(questions.map(({ id }) => id))) fail("Question IDs must be unique.");
if (!unique(questions.map(({ prompt }) => prompt.trim().toLowerCase()))) fail("Question prompts must be distinct so the bank does not count repeated stems as separate questions.");
if (!unique(resources.map(({ id }) => id))) fail("Resource IDs must be unique.");
if (lessons.some(({ chapter }, index) => chapter !== index + 1)) fail("Applied AI lessons must map chapters 01 through 40 in order.");
errors.push(...validatePublicationState({
  courseStatus: courses[0]?.status,
  publicationStatus: curriculum.publicationStatus,
  readiness: curriculum.readiness,
  lessons,
}));

for (const lesson of lessons) {
  if (!existsSync(resolve(root, lesson.sourceDraft))) fail(`${lesson.id} source draft is missing: ${lesson.sourceDraft}`);
  else {
    const source = readFileSync(resolve(root, lesson.sourceDraft), "utf8");
    const milestone = lesson.chapter <= 7 ? 1 : lesson.chapter <= 14 ? 2 : lesson.chapter <= 21 ? 3 : lesson.chapter <= 26 ? 4 : lesson.chapter <= 30 ? 5 : lesson.chapter <= 34 ? 6 : lesson.chapter <= 38 ? 7 : 8;
    if (!/^## Try the simulation$/m.test(source)) fail(`${lesson.id} source draft is missing its simulation prediction section.`);
    if (!new RegExp(`^## Course project — milestone ${milestone}(?:[:—]|\\s)`, "m").test(source)) fail(`${lesson.id} source draft is missing its milestone ${milestone} project task.`);
    if ((source.match(/```/g) ?? []).length % 2 !== 0) fail(`${lesson.id} source draft has an unclosed code fence.`);
    for (const match of source.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|<(https?:\/\/[^>\s]+)>/g)) {
      const url = match[1] ?? match[2];
      if (url && !recognizedCorrectionUtilities.has(url) && !resourceUrls.has(url)) {
        fail(`${lesson.id} chapter reference has no resource record: ${url}`);
      }
    }
  }
  if (!lesson.title.trim() || lesson.outcomes.length < 2 || lesson.sections.length < 3) fail(`${lesson.id} is missing title, outcomes, or section metadata.`);
  if (lesson.formativeQuestionIds.length !== 5) fail(`${lesson.id} must reference five formative questions.`);
  if (!lesson.assessmentIds.includes(`${lesson.moduleId}-assessment`) || !lesson.assessmentIds.includes("final-assessment")) fail(`${lesson.id} must reference its module and final assessments.`);
  if (!lesson.visual || !lesson.activityId) fail(`${lesson.id} must reference a visualization and activity.`);
  if (lesson.prerequisites.some((prereq) => !prereq.trim())) fail(`${lesson.id} contains a blank prerequisite.`);
  for (const section of lesson.sections) {
    if (section.resources.length === 0) fail(`${section.id} needs at least one reading resource.`);
    if (section.illustration) {
      const imagePath = resolve(root, "public", section.illustration.src.replace(/^\/+/, ""));
      if (!existsSync(imagePath)) fail(`${section.id} references a missing public illustration: ${section.illustration.src}`);
      if (!section.illustration.alt.trim() || !section.illustration.caption.trim()) fail(`${section.id} illustration needs both useful alt text and a caption.`);
    }
    for (const resourceId of section.resources) {
      const resource = resourcesById.get(resourceId);
      if (!resource) fail(`${section.id} references missing resource ${resourceId}.`);
      else if (!resource.lessonIds.includes(lesson.id)) fail(`${section.id} references ${resourceId}, but the resource is not mapped back to ${lesson.id}.`);
    }
    const expectedHintIds = [1, 2, 3].flatMap((level) => [
      `${lesson.id}-hint-${level}`,
      `${lesson.id}-hint-${level}-alternate`,
    ]);
    if (section.hints.length !== 6 || !unique(section.hints) || expectedHintIds.some((id) => !section.hints.includes(id))) {
      fail(`${section.id} must allowlist two authored candidates for each of its three hint levels.`);
    }
  }
  for (const id of lesson.formativeQuestionIds) {
    const item = questions.find((question) => question.id === id);
    if (!item || item.lessonId !== lesson.id || item.kind !== "formative" || item.assessmentId !== `${lesson.id}-formative`) fail(`${lesson.id} formative reference is invalid: ${id}`);
  }
}
for (const courseModule of curriculum.modules) {
  const catalogModule = courses[0]?.modules.find(({ id }) => id === courseModule.id);
  if (!catalogModule) fail(`${courseModule.id} is missing from the public course catalog.`);
  if (catalogModule && !catalogModule.lessonIds.every((id) => lessons.some((lesson) => lesson.id === id && lesson.moduleId === courseModule.id))) fail(`${courseModule.id} catalog lessons do not match the lesson index.`);
  const [first, last] = courseModule.chapterRange.split("-").map(Number);
  const expectedLessons = lessons.filter(({ chapter, moduleId }) => chapter >= first && chapter <= last && moduleId === courseModule.id);
  if (expectedLessons.length !== last - first + 1) fail(`${courseModule.id} chapter range does not resolve to every chapter.`);
  if (courseModule.questionIds.length !== 10) fail(`${courseModule.id} assessment must have ten questions.`);
  for (const id of courseModule.questionIds) {
    const item = questions.find((question) => question.id === id);
    if (!item || item.kind !== "module" || item.assessmentId !== courseModule.assessmentId) fail(`${courseModule.id} assessment question reference is invalid: ${id}`);
    else if (lessons.find(({ id: lessonId }) => lessonId === item.lessonId)?.moduleId !== courseModule.id) fail(`${courseModule.id} question ${id} is mapped to a lesson outside its module.`);
  }
  if (!unique(courseModule.questionIds)) fail(`${courseModule.id} assessment repeats a question ID.`);
}
if (curriculum.finalAssessment.questionIds.length !== 30) fail("Final assessment must have thirty questions.");
if (!Number.isFinite(curriculum.finalAssessment.passThreshold) || curriculum.finalAssessment.passThreshold < 0 || curriculum.finalAssessment.passThreshold > 1) fail("Final assessment passThreshold must be a fraction between 0 and 1.");
if (!unique(curriculum.modules.flatMap(({ questionIds }) => questionIds).concat(curriculum.finalAssessment.questionIds))) fail("Module and final assessment IDs must each be unique across their declared sets.");
const finalModuleIds = new Set<string>();
for (const id of curriculum.finalAssessment.questionIds) {
  const item = questions.find((question) => question.id === id);
  if (!item || item.kind !== "final" || item.assessmentId !== curriculum.finalAssessment.id) fail(`Final assessment question reference is invalid: ${id}`);
  else {
    const lesson = lessons.find(({ id: lessonId }) => lessonId === item.lessonId);
    if (lesson) finalModuleIds.add(lesson.moduleId);
  }
}
if (finalModuleIds.size !== curriculum.modules.length) fail("The final assessment must cover every course module.");

for (const resource of resources) {
  try {
    const url = new URL(resource.url);
    if (url.protocol !== "https:") fail(`Resource must use HTTPS: ${resource.id}`);
  } catch { fail(`Resource URL is invalid: ${resource.id}`); }
  if (!resource.title.trim() || !resource.provider.trim() || !resource.purpose.trim() || !resource.section.trim() || !resource.relevantSection.trim()) fail(`${resource.id} is missing source metadata.`);
  if (!["reading", "paper", "code", "video"].includes(resource.type)) fail(`${resource.id} has an unsupported resource type: ${resource.type}`);
  if (resource.type !== "video" && resource.timestamp !== null) fail(`${resource.id} has a video timestamp but is not a video.`);
  if (resource.durationMinutes !== null && (!Number.isInteger(resource.durationMinutes) || resource.durationMinutes <= 0)) fail(`${resource.id} has an invalid duration.`);
  if (resource.lessonIds.length === 0 || resource.lessonIds.some((id) => !lessonIds.has(id))) fail(`${resource.id} references a missing lesson.`);
  for (const lessonId of resource.lessonIds) {
    const lesson = lessons.find((candidate) => candidate.id === lessonId);
    if (!lesson?.sections.some((section) => section.resources.includes(resource.id))) fail(`${resource.id} maps to ${lessonId}, but no lesson section references it.`);
  }
  if (!unique(resource.lessonIds)) fail(`${resource.id} repeats a lesson mapping.`);
  if (resource.verificationStatus === "link-verified" && !/^\d{4}-\d{2}-\d{2}$/.test(resource.verifiedOn ?? "")) fail(`${resource.id} is marked verified without a verification date.`);
  if (resource.verificationStatus !== "link-verified" && resource.verifiedOn !== null) fail(`${resource.id} has a verification date without a verified status.`);
  if (resource.verificationStatus !== "link-verified") fail(`${resource.id} must have a completed URL/topic review before appearing in the course catalog.`);
}

for (const question of questions as PublicQuestion[]) {
  if (!lessonIds.has(question.lessonId)) fail(`${question.id} references a missing lesson.`);
  if (question.choices.length < 3 || !unique(question.choices.map(({ id }) => id))) fail(`${question.id} needs at least three uniquely identified choices.`);
  if (!question.prompt.trim()) fail(`${question.id} needs a prompt.`);
  if (!question.assessmentId) fail(`${question.id} has no assessment ID.`);
  const serialized = JSON.stringify(question).toLowerCase();
  if (/"(misconception|correctanswer|correctchoiceid|correctchoice|answerkey|solution)"\s*:/.test(serialized)) fail(`${question.id} appears to expose private grading or remediation content.`);
}

const formative = questions.filter(({ kind }) => kind === "formative").length;
const moduleItems = questions.filter(({ kind }) => kind === "module").length;
const finalItems = questions.filter(({ kind }) => kind === "final").length;
if (formative !== 200 || moduleItems !== 80 || finalItems !== 30) fail(`Question split mismatch: formative=${formative}, module=${moduleItems}, final=${finalItems}.`);

if (errors.length) {
  console.error(`Content validation failed (${errors.length} issues):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const verifiedResources = resources.filter(({ verificationStatus }) => verificationStatus === "link-verified").length;
  const reviewedLessons = lessons.filter(({ contentStatus }) => contentStatus === "reviewed").length;
  console.log(`Validated ${lessons.length} lessons (${reviewedLessons} reviewed; publication status: ${curriculum.publicationStatus}), ${formative} formative questions, ${moduleItems} module questions, ${finalItems} final questions, and ${resources.length} resources (${verifiedResources} link/topic checks verified).`);
}
