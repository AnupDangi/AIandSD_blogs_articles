"use client";

import { useState } from "react";
import type { TrustBoundaryScenario } from "@/content/visual-scenario-types";
import { evaluateTrustBoundaryCase } from "@/lib/trust-policy";

export function LessonTrustBoundarySandbox({ scenario }: { scenario: TrustBoundaryScenario }) {
  const [sourceId, setSourceId] = useState(scenario.defaults.source);
  const [actionId, setActionId] = useState(scenario.defaults.action);
  const [destinationId, setDestinationId] = useState(scenario.defaults.destination);
  const [evidenceCaseId, setEvidenceCaseId] = useState(scenario.defaults.evidenceCase);
  const [approvedRequest, setApprovedRequest] = useState<string | null>(null);

  const source = scenario.sources.find(({ id }) => id === sourceId) ?? scenario.sources[0];
  const action = scenario.actions.find(({ id }) => id === actionId) ?? scenario.actions[0];
  const destination = scenario.destinations.find(({ id }) => id === destinationId) ?? scenario.destinations[0];
  const requestKey = `${source.id}|${action.id}|${destination.id}|${action.requestText}`;
  const approval = approvedRequest === requestKey;
  const staleApproval = approvedRequest !== null && !approval;
  const evaluated = evaluateTrustBoundaryCase(scenario, {
    source: source.id,
    action: action.id,
    destination: destination.id,
    approval,
    evidenceCaseId,
  });
  const evidence = evaluated.evidence;
  const decision = evaluated.decision;

  function resetScenario() {
    setSourceId(scenario.defaults.source);
    setActionId(scenario.defaults.action);
    setDestinationId(scenario.defaults.destination);
    setEvidenceCaseId(scenario.defaults.evidenceCase);
    setApprovedRequest(null);
  }

  return <div className="engine-demo">
    <p className="eyebrow">TOY SCENARIO · {scenario.title}</p>
    <p className="engine-explainer">{scenario.prompt}</p>

    <label className="demo-select-label" htmlFor="trust-source">Instruction source</label>
    <select id="trust-source" className="demo-select" value={source.id} onChange={(event) => setSourceId(event.target.value as typeof sourceId)}>
      {scenario.sources.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>

    <label className="demo-select-label" htmlFor="trust-action">Requested action</label>
    <select id="trust-action" className="demo-select" value={action.id} onChange={(event) => setActionId(event.target.value as typeof actionId)}>
      {scenario.actions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>

    <label className="demo-select-label" htmlFor="trust-destination">Destination / scope</label>
    <select id="trust-destination" className="demo-select" value={destination.id} onChange={(event) => setDestinationId(event.target.value as typeof destinationId)}>
      {scenario.destinations.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>

    <blockquote className="untrusted-quote" aria-label={`${source.label} text`}>
      <span className="eyebrow">{source.label}</span><br/>{source.message}
    </blockquote>

    <label className="demo-select-label" htmlFor="trust-evidence">Evidence inspected</label>
    <select id="trust-evidence" className="demo-select" value={evidence.id} onChange={(event) => setEvidenceCaseId(event.target.value)}>
      {scenario.evidenceCases.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
    <p className="engine-explainer">{evidence.detail}{!evaluated.evidenceScopeMatches ? ` This evidence is scoped to ${scenario.actions.find(({ id }) => id === evidence.action)?.label ?? evidence.action} at ${scenario.destinations.find(({ id }) => id === evidence.destination)?.label ?? evidence.destination}; it does not verify the current request.` : ""}</p>

    <div className="trust-gates">
      <button className={`demo-toggle ${approval ? "demo-toggle-on" : ""}`} onClick={() => setApprovedRequest(approval ? null : requestKey)} aria-pressed={approval}>
        <span className="demo-check">{approval ? "✓" : ""}</span>{approval ? "Approval bound to this request" : "Approve this exact request"}
      </button>
      {staleApproval && <p className="engine-explainer" role="status">The previous approval is stale because the instruction source, action, or destination changed.</p>}
    </div>

    <dl className="engine-state-table" aria-label="Trust decision inputs">
      <div><dt>Source</dt><dd>{source.label}</dd></div>
      <div><dt>Action</dt><dd>{action.label}</dd></div>
      <div><dt>Destination</dt><dd>{destination.label}</dd></div>
      <div><dt>Evidence</dt><dd>{evaluated.evidenceVerified ? "Verified for this action and destination" : evaluated.evidenceScopeMatches ? "Insufficient or irrelevant" : "Evidence scope does not match request"}</dd></div>
      <div><dt>Approval</dt><dd>{approval ? "Matches current request" : "Not valid for current request"}</dd></div>
    </dl>

    <div className={`trust-decision ${decision.allowed ? "trust-allowed" : "trust-blocked"}`} role="status" aria-live="polite" aria-atomic="true">
      <span aria-hidden="true">{decision.allowed ? "✓" : "⊘"}</span>
      <div><strong>{decision.allowed ? "Action allowed by toy policy" : "Action blocked by toy policy"}</strong><p>{decision.reason}</p></div>
    </div>
    <button className="demo-toggle" onClick={resetScenario}>Reset this scenario</button>
    <p className="engine-explainer">This deterministic fixture illustrates one policy boundary. It does not run a model, inspect real evidence, or prove containment against prompt injection.</p>
  </div>;
}
