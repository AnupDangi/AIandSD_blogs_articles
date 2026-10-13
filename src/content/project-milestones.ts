export const projectMilestones = [
  { id: "ai-milestone-01", title: "Typed model-call service", checklist: ["Define a typed request and response boundary", "Record a deterministic baseline", "Document a model or routing decision"] },
  { id: "ai-milestone-02", title: "Evidence-backed retrieval", checklist: ["Prepare a repeatable document fixture", "Compare a retrieval strategy", "Return a source citation with the answer"] },
  { id: "ai-milestone-03", title: "Durable tool workflow", checklist: ["Define a bounded tool interface", "Persist a workflow checkpoint", "Demonstrate safe retry or resume"] },
  { id: "ai-milestone-04", title: "Evaluation & observability", checklist: ["Create a small evaluation set", "Capture a trace for a failed case", "Report quality by at least one slice"] },
  { id: "ai-milestone-05", title: "Latency and safe releases", checklist: ["Set a request deadline", "Add a bounded fallback strategy", "Describe a canary or rollback check"] },
  { id: "ai-milestone-06", title: "Trust boundaries", checklist: ["Mark untrusted input boundaries", "Define an approval policy", "Validate evidence before making a claim"] },
  { id: "ai-milestone-07", title: "Efficiency & recovery", checklist: ["Measure a repeated-work optimization", "Inject a provider or worker failure", "Show a recoverable job state"] },
  { id: "ai-milestone-08", title: "Production readiness", checklist: ["Write a runbook and readiness review", "Document a threat or failure model", "Prepare a short design defense"] },
] as const;

export function milestoneChecklistIds(milestoneId: string): string[] | null {
  const milestone = projectMilestones.find(({ id }) => id === milestoneId);
  return milestone ? milestone.checklist.map((_, index) => `${milestone.id}-item-${index + 1}`) : null;
}

export function hasExactMilestoneChecklist(
  milestoneId: string,
  items: Array<{ itemId: string; completed: boolean }>,
): boolean {
  const expectedIds = milestoneChecklistIds(milestoneId);
  if (!expectedIds || items.length !== expectedIds.length) return false;
  const actualIds = items.map(({ itemId }) => itemId);
  return new Set(actualIds).size === actualIds.length &&
    expectedIds.every((itemId) => actualIds.includes(itemId));
}
