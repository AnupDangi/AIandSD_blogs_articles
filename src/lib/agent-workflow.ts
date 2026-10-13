import type { AgentWorkflowScenario } from "@/content/visual-scenario-types";

export type AgentWorkflowStatus = "active" | "interrupted" | "event-injected" | "budget-exhausted" | "complete";

export function compareAndSwapRevision(currentRevision: number, expectedRevision: number) {
  if (!Number.isSafeInteger(currentRevision) || !Number.isSafeInteger(expectedRevision) || currentRevision < 0 || expectedRevision < 0) {
    throw new Error("Revisions must be non-negative safe integers.");
  }
  if (currentRevision === expectedRevision && currentRevision === Number.MAX_SAFE_INTEGER) {
    throw new Error("The next revision would exceed the safe integer range.");
  }
  return currentRevision === expectedRevision
    ? { accepted: true, revision: currentRevision + 1, reason: "Expected revision matched; next revision committed." }
    : { accepted: false, revision: currentRevision, reason: `Conflict: expected revision ${expectedRevision}, current revision ${currentRevision}.` };
}

export function agentWorkflowEventOutcome(scenario: AgentWorkflowScenario) {
  if (scenario.injectedEventMode === "optimistic-write") {
    if (scenario.currentRevision === undefined || scenario.expectedRevision === undefined) throw new Error("The optimistic-write fixture is missing a revision.");
    const result = compareAndSwapRevision(scenario.currentRevision, scenario.expectedRevision);
    return result.accepted
      ? `Compare-and-swap accepts the write and creates revision ${result.revision}.`
      : `Compare-and-swap rejects the stale write: ${result.reason} Reload before retrying.`;
  }
  return scenario.injectedEventOutcome;
}

export function isAgentWorkflowEventEligible(scenario: AgentWorkflowScenario, step: number) {
  const prerequisiteIndex = scenario.states.findIndex(({ id }) => id === scenario.injectedEventAfterState);
  return prerequisiteIndex >= 0 && step >= prerequisiteIndex;
}

export function inspectAgentWorkflow(
  scenario: AgentWorkflowScenario,
  step: number,
  budget: number,
  interrupted = false,
  eventInjected = false,
) {
  const currentIndex = Math.min(Math.max(0, step), scenario.states.length - 1);
  const atTerminal = currentIndex === scenario.states.length - 1;
  const exhausted = step >= budget && !atTerminal;
  const status: AgentWorkflowStatus = interrupted
    ? "interrupted"
    : eventInjected
      ? "event-injected"
      : exhausted
        ? "budget-exhausted"
        : atTerminal
          ? "complete"
          : "active";
  return {
    currentIndex,
    state: scenario.states[currentIndex],
    status,
    canAdvance: !interrupted && !exhausted && !atTerminal,
    progress: scenario.states.map((state, index) => ({
      ...state,
      status: index < currentIndex ? "done" as const : index === currentIndex ? "current" as const : "pending" as const,
    })),
  };
}

export function nextAgentWorkflowStep(scenario: AgentWorkflowScenario, step: number, budget: number) {
  const view = inspectAgentWorkflow(scenario, step, budget);
  return view.canAdvance ? step + 1 : step;
}
