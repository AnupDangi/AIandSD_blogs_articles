"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { EvaluationConsoleScenario } from "@/content/visual-scenario-types";
import { calibrateJudge, costPerSuccessfulTask, decideReleaseCandidate, evaluateTrajectory, inspectTrace, scoreEvaluationSlices } from "@/lib/evaluation-console";

export function LessonEvaluationConsole({ scenario }: { scenario: EvaluationConsoleScenario }) {
  if (scenario.kind === "slice-threshold") return <SliceThreshold scenario={scenario}/>;
  if (scenario.kind === "judge-calibration") return <JudgeCalibration scenario={scenario}/>;
  if (scenario.kind === "trajectory") return <TrajectoryEvaluation scenario={scenario}/>;
  if (scenario.kind === "trace-completeness") return <TraceCompleteness scenario={scenario}/>;
  if (scenario.kind === "cost-per-success") return <CostPerSuccess scenario={scenario}/>;
  return <ReleaseGate scenario={scenario}/>;
}

function SliceThreshold({ scenario }: { scenario: Extract<EvaluationConsoleScenario, { kind: "slice-threshold" }> }) {
  const [threshold, setThreshold] = useState(scenario.defaultThreshold);
  const result = scoreEvaluationSlices(scenario, threshold);
  return <div className="engine-demo"><Header scenario={scenario}/><ThresholdControl id="slice-threshold" threshold={threshold} onChange={setThreshold}/>
    <div className="eval-summary"><strong>{result.passing} / {result.total}</strong><span>slices meet this fixed acceptance floor</span></div>
    <Status>At threshold {threshold.toFixed(2)}, {result.passing} of {result.total} slices pass.</Status>
    <div className="eval-table" role="table" aria-label="Fixed evaluation slices"><EvalHead columns={["SLICE", "N", "SCORE", "RESULT"]}/>{result.slices.map((slice) => <div className="eval-table-row" role="row" key={slice.id}><strong role="cell">{slice.label}</strong><span role="cell">{slice.count}</span><span role="cell">{slice.score.toFixed(2)}</span><span role="cell" className={slice.passes ? "state-good" : "state-warning"}>{slice.passes ? "Pass" : "Review"}</span></div>)}</div>
    <ResetButton onClick={() => setThreshold(scenario.defaultThreshold)}/>
    <Note>These are fixed, synthetic values with small sample sizes, not a quality estimate for a deployed system.</Note>
  </div>;
}

function JudgeCalibration({ scenario }: { scenario: Extract<EvaluationConsoleScenario, { kind: "judge-calibration" }> }) {
  const [threshold, setThreshold] = useState(scenario.defaultThreshold);
  const result = calibrateJudge(scenario, threshold);
  return <div className="engine-demo"><Header scenario={scenario}/><ThresholdControl id="judge-threshold" threshold={threshold} onChange={setThreshold}/>
    <div className="metric-grid"><Metric label="Raw agreement" value={`${(result.agreement * 100).toFixed(0)}%`}/><Metric label="False passes" value={String(result.counts.falsePass)}/><Metric label="False rejects" value={String(result.counts.falseFail)}/></div>
    <Status>At confidence threshold {threshold.toFixed(2)}, judge agreement is {result.agreements} of {result.total}; {result.counts.falsePass} false passes and {result.counts.falseFail} false rejects.</Status>
    <div className="eval-table" role="table" aria-label="Judge comparison"><EvalHead columns={["CASE", "REVIEWER", "JUDGE", "RESULT"]}/>{result.cases.map((item) => <div className="eval-table-row" role="row" key={item.id}><strong role="cell">{item.label}</strong><span role="cell">{item.humanLabel}</span><span role="cell">{item.predicted} · {item.confidence.toFixed(2)}</span><span role="cell" className={item.humanLabel === item.predicted ? "state-good" : "state-warning"}>{item.humanLabel === item.predicted ? "Agree" : "Disagree"}</span></div>)}</div>
    <ResetButton onClick={() => setThreshold(scenario.defaultThreshold)}/>
    <Note>Reviewer labels and judge scores are synthetic teaching fixtures. Raw agreement is not a reliability-adjusted statistic and does not replace adjudication.</Note>
  </div>;
}

function TrajectoryEvaluation({ scenario }: { scenario: Extract<EvaluationConsoleScenario, { kind: "trajectory" }> }) {
  const [runId, setRunId] = useState(scenario.runs[0].id);
  const run = scenario.runs.find(({ id }) => id === runId) ?? scenario.runs[0];
  const result = evaluateTrajectory(run);
  return <div className="engine-demo"><Header scenario={scenario}/><SelectControl id="trajectory-run" label="Recorded run" value={run.id} options={scenario.runs.map(({ id, label }) => ({ id, label }))} onChange={setRunId}/>
    <div className="metric-grid"><Metric label="Final outcome" value={result.finalPass ? "Pass" : "Fail"}/><Metric label="Action path" value={result.pathPass ? "Pass" : "Fail"}/><Metric label="Both required" value={result.accepted ? "Accept" : "Reject"}/></div>
    <Status>{run.label}: final outcome {result.finalPass ? "passes" : "fails"}, action path {result.pathPass ? "passes" : "fails"}; run {result.accepted ? "accepted" : "rejected"}.</Status>
    <ul className="engine-case-list" aria-label="Recorded trajectory steps">{run.steps.map((step) => <li key={step.id}><strong>{step.action} · expected {step.expected ? "allowed" : "blocked"}</strong><span>{step.observation}</span></li>)}</ul>
    <ResetButton onClick={() => setRunId(scenario.runs[0].id)}/>
    <Note>Only a recorded deterministic fixture is evaluated here. It does not execute a tool or run a model.</Note>
  </div>;
}

function TraceCompleteness({ scenario }: { scenario: Extract<EvaluationConsoleScenario, { kind: "trace-completeness" }> }) {
  const [traceId, setTraceId] = useState(scenario.traces[0].id);
  const result = inspectTrace(scenario, traceId);
  return <div className="engine-demo"><Header scenario={scenario}/><SelectControl id="trace-run" label="Request trace" value={result.trace.id} options={scenario.traces.map(({ id, label }) => ({ id, label }))} onChange={setTraceId}/>
    <div className="metric-grid"><Metric label="Span coverage" value={`${(result.completeness * 100).toFixed(0)}%`}/><Metric label="Missing spans" value={String(result.missing.length)}/><Metric label="Correlation" value={result.correlationStatus === "unavailable" ? "Unavailable" : result.correlated ? "Consistent" : "Mismatch"}/></div>
    <Status>{result.trace.label}: {result.spans.length - result.missing.length} of {result.spans.length} spans present; {result.missing.length} missing; correlation {result.correlationStatus}; request {result.reconstructable ? "reconstructable" : "not reconstructable"}.</Status>
    <ul className="engine-case-list" aria-label="Required trace spans">{result.spans.map((span) => <li key={span.id}><strong>{span.id}</strong><span>{span.present ? "Recorded" : "Missing"}</span></li>)}</ul>
    <ResetButton onClick={() => setTraceId(scenario.traces[0].id)}/>
    <p className="engine-explainer">{result.trace.note}</p><Note>Span names and completeness are authored fixtures; no live telemetry is collected. Do not place raw prompts, secrets, or private documents in trace attributes.</Note>
  </div>;
}

function CostPerSuccess({ scenario }: { scenario: Extract<EvaluationConsoleScenario, { kind: "cost-per-success" }> }) {
  const [candidateId, setCandidateId] = useState(scenario.candidates[0].id);
  const candidate = scenario.candidates.find(({ id }) => id === candidateId) ?? scenario.candidates[0];
  const cost = costPerSuccessfulTask(candidate);
  return <div className="engine-demo"><Header scenario={scenario}/><SelectControl id="cost-candidate" label="Route profile" value={candidate.id} options={scenario.candidates.map(({ id, label }) => ({ id, label }))} onChange={setCandidateId}/>
    <div className="metric-grid"><Metric label="Total fixture cost" value={`$${candidate.cost.toFixed(2)}`}/><Metric label="Successful tasks" value={`${candidate.successes} / ${candidate.tasks}`}/><Metric label="Cost / success" value={cost === null ? "Unavailable" : `$${cost.toFixed(3)}`}/></div>
    <Status>{candidate.label}: fixture cost ${candidate.cost.toFixed(2)} for {candidate.successes} successful tasks; cost per success {cost === null ? "unavailable" : `$${cost.toFixed(3)}`}.</Status>
    <ResetButton onClick={() => setCandidateId(scenario.candidates[0].id)}/>
    <p className="engine-explainer">{candidate.source}</p><Note>Do not interpret these invented units as provider pricing. Use billed usage and a held-out workload before making a cost decision.</Note>
  </div>;
}

function ReleaseGate({ scenario }: { scenario: Extract<EvaluationConsoleScenario, { kind: "release-gate" }> }) {
  const [candidateId, setCandidateId] = useState(scenario.candidates[1].id);
  const [aggregateOnly, setAggregateOnly] = useState(false);
  const result = decideReleaseCandidate(scenario, candidateId, aggregateOnly);
  return <div className="engine-demo"><Header scenario={scenario}/><SelectControl id="release-candidate" label="Candidate" value={result.candidate.id} options={scenario.candidates.map(({ id, label }) => ({ id, label }))} onChange={setCandidateId}/>
    <button className={`demo-toggle ${aggregateOnly ? "demo-toggle-on" : ""}`} aria-pressed={aggregateOnly} onClick={() => setAggregateOnly((value) => !value)}><span className="demo-check">{aggregateOnly ? "✓" : ""}</span> Ignore slice gates (unsafe comparison)</button>
    <div className="metric-grid"><Metric label="Aggregate" value={`${(result.candidate.aggregate * 100).toFixed(0)}%`}/><Metric label="Required aggregate" value={`${(scenario.aggregateFloor * 100).toFixed(0)}%`}/><Metric label="Promotion" value={result.promoted ? "Eligible" : "Blocked"}/></div>
    <Status>{result.candidate.label}: aggregate {result.aggregatePasses ? "passes" : "fails"}; critical slices {result.slicePasses ? "pass" : "fail"}; promotion {result.promoted ? "eligible" : "blocked"}{aggregateOnly ? " with slice gates ignored" : " with all gates applied"}.</Status>
    <div className="eval-table" role="table" aria-label="Candidate release gates"><EvalHead columns={["SLICE", "SCORE", "FLOOR", "RESULT"]}/>{result.slices.map((slice) => <div className="eval-table-row" role="row" key={slice.id}><strong role="cell">{slice.label}</strong><span role="cell">{(slice.score * 100).toFixed(0)}%</span><span role="cell">{(scenario.sliceFloor * 100).toFixed(0)}%</span><span role="cell" className={slice.passes ? "state-good" : "state-warning"}>{slice.passes ? "Pass" : "Block"}</span></div>)}</div>
    <ResetButton onClick={() => { setCandidateId(scenario.candidates[1].id); setAggregateOnly(false); }}/>
    <Note>Promotion requires the aggregate floor and every critical slice floor. Aggregate-only mode is shown to expose the failure mode; it is not a release recommendation.</Note>
  </div>;
}

function Header({ scenario }: { scenario: EvaluationConsoleScenario }) { return <><p className="eyebrow">TOY EVALUATION · {scenario.title}</p><p className="engine-explainer">{scenario.prompt}</p></>; }
function ResetButton({ onClick }: { onClick: () => void }) { return <button className="demo-toggle" onClick={onClick}>↺ Reset controls</button>; }
function Status({ children }: { children: ReactNode }) { return <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{children}</p>; }
function ThresholdControl({ id, threshold, onChange }: { id: string; threshold: number; onChange: (value: number) => void }) { return <div className="demo-control-row"><label htmlFor={id}>Decision threshold <output>{threshold.toFixed(2)}</output></label><input id={id} type="range" min="0.4" max="0.95" step="0.01" value={threshold} onChange={(event) => onChange(Number(event.target.value))}/></div>; }
function SelectControl({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: { id: string; label: string }[]; onChange: (value: string) => void }) { return <><label className="demo-select-label" htmlFor={id}>{label}</label><select id={id} className="demo-select" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></>; }
function EvalHead({ columns }: { columns: string[] }) { return <div className="eval-table-head" role="row">{columns.map((column) => <span role="columnheader" key={column}>{column}</span>)}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="engine-metric"><span>{label}</span><strong>{value}</strong></div>; }
function Note({ children }: { children: string }) { return <p className="engine-explainer">{children}</p>; }
