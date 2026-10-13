type PublicationState = {
  courseStatus: string | undefined;
  publicationStatus: string;
  readiness: string;
  lessons: readonly { id: string; contentStatus: string }[];
};

/** Public metadata checks only; private human signoff remains an import gate. */
export function validatePublicationState(state: PublicationState): string[] {
  const errors: string[] = [];
  const draft = state.courseStatus === "in-progress"
    && state.publicationStatus === "in-progress"
    && state.readiness === "incomplete-editorial-review";
  const released = state.courseStatus === "complete"
    && state.publicationStatus === "complete"
    && state.readiness === "ready";

  if (!draft && !released) {
    errors.push("Flagship course, manifest publication status, and readiness must consistently describe either an in-progress editorial draft or a complete, ready release.");
  }
  for (const lesson of state.lessons) {
    if (lesson.contentStatus !== "draft-needs-editorial-review" && lesson.contentStatus !== "reviewed") {
      errors.push(`${lesson.id} has an unsupported editorial status: ${lesson.contentStatus}.`);
    } else if (released && lesson.contentStatus !== "reviewed") {
      errors.push(`${lesson.id} must be reviewed before the course can be complete and ready.`);
    }
  }
  return errors;
}
