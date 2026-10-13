import { describe, expect, it } from "vitest";
import { lessons } from "@/content/catalog";
import { agentWorkflowEventOutcome, compareAndSwapRevision, inspectAgentWorkflow, isAgentWorkflowEventEligible, nextAgentWorkflowStep } from "@/lib/agent-workflow";
import { agentWorkflowScenarioManifest } from "@/lib/visual-scenarios";

describe("lesson-specific agent workflow scenarios", () => {
  it("provides a unique versioned workflow for each assigned lesson", () => {
    const assigned = lessons.filter((lesson) => lesson.sections.some((section) => section.visual === "agent-state-machine"));
    expect(Object.keys(agentWorkflowScenarioManifest).sort()).toEqual(assigned.map(({ id }) => id).sort());
    expect(new Set(Object.values(agentWorkflowScenarioManifest).map(({ title }) => title)).size).toBe(assigned.length);
  });

  it("gates replay events and pauses the mounted workflow at its current stage", () => {
    const scenario = agentWorkflowScenarioManifest["ai-19"];
    const step = nextAgentWorkflowStep(scenario, 1, 5);
    expect(step).toBe(2);
    expect(inspectAgentWorkflow(scenario, step, 5, false, true).state.id).toBe("checkpoint");
    expect(inspectAgentWorkflow(scenario, step, 5, false, true).status).toBe("event-injected");
    expect(inspectAgentWorkflow(scenario, step, 5, true).status).toBe("interrupted");
    expect(inspectAgentWorkflow(scenario, step, 5, true).currentIndex).toBe(2);
    expect(isAgentWorkflowEventEligible(scenario, 0)).toBe(false);
    expect(isAgentWorkflowEventEligible(scenario, 2)).toBe(true);
  });

  it("stops at the configured budget and marks completion only at the terminal state", () => {
    const scenario = agentWorkflowScenarioManifest["ai-17"];
    expect(nextAgentWorkflowStep(scenario, 1, 2)).toBe(2);
    expect(nextAgentWorkflowStep(scenario, 2, 2)).toBe(2);
    expect(inspectAgentWorkflow(scenario, 2, 2).status).toBe("budget-exhausted");
    expect(inspectAgentWorkflow(scenario, scenario.states.length - 1, 2).status).toBe("complete");
  });

  it("applies compare-and-swap revisions and rejects a stale writer without changing state", () => {
    expect(compareAndSwapRevision(5, 4)).toEqual({ accepted: false, revision: 5, reason: "Conflict: expected revision 4, current revision 5." });
    expect(compareAndSwapRevision(5, 5)).toEqual({ accepted: true, revision: 6, reason: "Expected revision matched; next revision committed." });
    expect(() => compareAndSwapRevision(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toThrow(/safe integer range/);
    const scenario = agentWorkflowScenarioManifest["ai-38"];
    expect(agentWorkflowEventOutcome(scenario)).toContain("rejects the stale write");
  });
});
