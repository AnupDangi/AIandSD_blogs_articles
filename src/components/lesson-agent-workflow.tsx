"use client";

import { useState } from "react";
import type { AgentWorkflowScenario } from "@/content/visual-scenario-types";
import { agentWorkflowEventOutcome, inspectAgentWorkflow, isAgentWorkflowEventEligible, nextAgentWorkflowStep } from "@/lib/agent-workflow";

export function LessonAgentWorkflow({ scenario }: { scenario: AgentWorkflowScenario }) {
  const [step, setStep] = useState(0);
  const [budget, setBudget] = useState(5);
  const [interrupted, setInterrupted] = useState(false);
  const [eventInjected, setEventInjected] = useState(false);
  const view = inspectAgentWorkflow(scenario, step, budget, interrupted, eventInjected);
  const eventEligible = isAgentWorkflowEventEligible(scenario, view.currentIndex);
  const detail = view.status === "event-injected" ? agentWorkflowEventOutcome(scenario) : view.state.detail;
  const statusText = {
    active: view.state.label,
    interrupted: "Interrupted at current stage",
    "event-injected": "Injected event · handled",
    "budget-exhausted": "Step budget exhausted · stopped",
    complete: "Workflow complete",
  }[view.status];

  return <div className="engine-demo">
    <p className="eyebrow">TOY WORKFLOW · {scenario.title}</p>
    <p className="engine-explainer">{scenario.prompt}</p>
    <div className="demo-range-grid">
      <label htmlFor="agent-budget">Step budget <output>{budget} steps</output><input id="agent-budget" type="range" min="2" max="8" value={budget} onChange={(event) => setBudget(Number(event.target.value))}/></label>
      <div className="demo-action-stack">
        <button className="demo-toggle" onClick={() => { setInterrupted((value) => !value); setEventInjected(false); }} aria-pressed={interrupted}><span className="demo-check">{interrupted ? "✓" : ""}</span> {interrupted ? "Resume workflow" : "Interrupt workflow"}</button>
        <button className="demo-toggle" disabled={!eventEligible} onClick={() => setEventInjected((value) => !value)} aria-pressed={eventInjected}><span className="demo-check">{eventInjected ? "✓" : ""}</span> {scenario.injectedEventLabel}</button>
        {!eventEligible && <small>Available after: {scenario.states.find(({ id }) => id === scenario.injectedEventAfterState)?.label}</small>}
      </div>
    </div>
    <div className="state-flow" aria-label={`Workflow state: ${statusText}`} role="list">{view.progress.map((state, index) => <div key={state.id} className={`state-flow-step ${state.status === "done" ? "state-flow-done" : ""} ${state.status === "current" ? "state-flow-current" : ""}`} role="listitem"><span>{state.status === "done" ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{state.label}</small></div>)}</div>
    <div role="status" aria-live="polite" aria-atomic="true" className={`state-banner ${view.status === "interrupted" || view.status === "budget-exhausted" ? "state-banner-warn" : ""}`}>
      <span>WORKFLOW STATE</span><strong>{statusText}</strong><p>{detail}</p>
      <small>Current stage in this view: {view.state.label} · step {view.currentIndex + 1} of {scenario.states.length}</small>
    </div>
    <button className="demo-primary" disabled={interrupted || eventInjected || !view.canAdvance} onClick={() => setStep((current) => nextAgentWorkflowStep(scenario, current, budget))}>
      Advance one step →
    </button>
    <button className="demo-toggle" onClick={() => { setStep(0); setInterrupted(false); setEventInjected(false); }}>↺ Restart workflow</button>
    <p className="engine-explainer">This versioned workflow is a deterministic teaching fixture. Interrupt and resume state exists only while this view is mounted; it does not prove durable storage or run real tools.</p>
  </div>;
}
