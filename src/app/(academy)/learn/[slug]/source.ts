import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { lessons } from "@/content/catalog";
export { splitLessonDraft } from "@/content/lesson-sections";

const handbookRoot = path.resolve(process.cwd(), "docs", "applied-ai");

/** Only load source paths explicitly mapped by a public lesson manifest. */
export async function loadPublicLessonDraft(sourceDraft: string): Promise<string | null> {
  const isMapped = lessons.some((lesson) => lesson.sourceDraft === sourceDraft);
  if (!isMapped || !sourceDraft.startsWith("docs/applied-ai/")) return null;

  const absolutePath = path.resolve(/* turbopackIgnore: true */ process.cwd(), sourceDraft);
  if (!absolutePath.startsWith(`${handbookRoot}${path.sep}`)) return null;

  try {
    return await readFile(absolutePath, "utf8");
  } catch {
    return null;
  }
}
