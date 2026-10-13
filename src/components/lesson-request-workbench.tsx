"use client";

import { useState } from "react";
import type { RequestWorkbenchScenario } from "@/content/visual-scenario-types";
import { advancePromptCache, evaluateAnswerExample, routeRequestTask, summarizePromptVersion, traceRequestPipeline, type RequestFailure } from "@/lib/request-workbench";

export function LessonRequestWorkbench({ scenario }: { scenario: RequestWorkbenchScenario }) {
  const [failure, setFailure] = useState<RequestFailure>("none");
  const [exampleId, setExampleId] = useState(scenario.kind === "structured-output" ? scenario.examples[0].id : "");
  const [versionId, setVersionId] = useState(scenario.kind === "prompt-evaluation" ? scenario.versions[0].id : "");
  const [taskId, setTaskId] = useState(scenario.kind === "routing" ? scenario.tasks[0].id : "");
  const [confidenceFloor, setConfidenceFloor] = useState(0.5);
  const [requestIndex, setRequestIndex] = useState(0);
  const [seenPrefixes, setSeenPrefixes] = useState<string[]>([]);

  if (scenario.kind === "pipeline") {
    const trace = traceRequestPipeline(scenario, failure);
    return <div className="engine-demo">
      <p className="eyebrow">TOY SCENARIO · {scenario.title}</p><p className="engine-explainer">{scenario.prompt}</p>
      <label className="demo-select-label" htmlFor="pipeline-failure">Inject a request condition</label>
      <select id="pipeline-failure" className="demo-select" value={failure} onChange={(event) => setFailure(event.target.value as RequestFailure)}>
        {scenario.failureOptions.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
      </select>
      <dl className="engine-state-table" aria-label="Request pipeline trace">{trace.stages.map((stage) => <div key={stage.id}><dt>{stage.label}</dt><dd className={stage.status === "failed" ? "state-warning" : stage.status === "passed" ? "state-good" : ""}>{stage.status}: {stage.observation}</dd></div>)}</dl>
      <div className="demo-action-stack"><button className="demo-toggle" onClick={() => setFailure("none")}>↺ Reset scenario</button></div>
      <p className="engine-explainer" role="status">Outcome: {trace.success ? "answer can be returned after checks" : `stopped at ${trace.terminal}`}. This deterministic trace is a teaching fixture, not a live request or measured service.</p>
    </div>;
  }

  if (scenario.kind === "structured-output") {
    const result = evaluateAnswerExample(scenario, exampleId);
    if (!result.example) return <p className="engine-placeholder">No output examples are configured.</p>;
    return <div className="engine-demo">
      <p className="eyebrow">TOY SCENARIO · {scenario.title}</p><p className="engine-explainer">{scenario.prompt}</p>
      <label className="demo-select-label" htmlFor="answer-example">Example response</label>
      <select id="answer-example" className="demo-select" value={exampleId} onChange={(event) => setExampleId(event.target.value)}>{scenario.examples.map((example) => <option key={example.id} value={example.id}>{example.label}</option>)}</select>
      <pre className="code-block">{JSON.stringify({ ...(result.example.answerPresent ? { answer: result.example.answer } : {}), status: result.example.status, citations: result.example.citations }, null, 2)}</pre>
      <dl className="engine-state-table" aria-label="Answer contract checks">
        <div><dt>Schema shape</dt><dd className={result.schemaValid ? "state-good" : "state-warning"}>{result.schemaValid ? "Pass" : "Fail"}</dd></div>
        <div><dt>Answer/status invariant</dt><dd className={result.answerConsistent ? "state-good" : "state-warning"}>{result.answerConsistent ? "Pass" : "Fail"}</dd></div>
        <div><dt>Citation allowlist</dt><dd className={result.citationsAllowed ? "state-good" : "state-warning"}>{result.citationsAllowed ? "Pass" : "Fail"}</dd></div>
      </dl>
      <div className="demo-action-stack"><button className="demo-toggle" onClick={() => setExampleId(scenario.examples[0].id)}>↺ Reset controls</button></div>
      <p className="engine-explainer" role="status">Result: {result.accepted ? "accepted by these toy checks" : "rejected by at least one check"}. Passing shape checks alone does not prove the answer is factually supported.</p>
    </div>;
  }

  if (scenario.kind === "prompt-evaluation") {
    const summary = summarizePromptVersion(scenario, versionId);
    return <div className="engine-demo">
      <p className="eyebrow">TOY SCENARIO · {scenario.title}</p><p className="engine-explainer">{scenario.prompt}</p>
      <label className="demo-select-label" htmlFor="prompt-version">Prompt version</label>
      <select id="prompt-version" className="demo-select" value={versionId} onChange={(event) => setVersionId(event.target.value)}>{scenario.versions.map((version) => <option key={version.id} value={version.id}>{version.label}</option>)}</select>
      <dl className="engine-state-table" aria-label="Prompt trust boundary"><div><dt>Trusted instruction</dt><dd>{scenario.trustedInstruction}</dd></div><div><dt>Untrusted retrieved text</dt><dd>{scenario.untrustedDocument}</dd></div></dl>
      <div className="metric-grid"><Metric label="Passing cases" value={`${summary.passed}/${summary.total}`}/><Metric label="Overall fixture pass rate" value={`${(summary.rate * 100).toFixed(0)}%`}/></div>
      <div className="eval-table" role="table" aria-label="Prompt evaluation by slice"><div className="eval-table-head" role="row"><span role="columnheader">SLICE</span><span role="columnheader">PASS</span><span role="columnheader">CASES</span><span role="columnheader">RATE</span></div>{summary.slices.map((slice) => <div className="eval-table-row" role="row" key={slice.slice}><strong role="cell">{slice.slice}</strong><span role="cell">{slice.passed}</span><span role="cell">{slice.total}</span><span role="cell">{(slice.rate * 100).toFixed(0)}%</span></div>)}</div>
      <ul className="engine-case-list" aria-label="Labeled prompt outcomes">{summary.version.results.map((result) => <li key={result.id}><strong>{result.case}</strong><span>{result.observation}</span><small>{result.slice} · {result.passed ? "pass" : "fail"}</small></li>)}</ul>
      <div className="demo-action-stack"><button className="demo-toggle" onClick={() => setVersionId(scenario.versions[0].id)}>↺ Reset controls</button></div>
      <p className="engine-explainer">These five labeled examples are synthetic. Compare slices before deciding whether a prompt version is better; this is not a live prompt evaluation.</p>
    </div>;
  }

  if (scenario.kind === "routing") {
    const task = scenario.tasks.find(({ id }) => id === taskId) ?? scenario.tasks[0];
    const route = routeRequestTask(task, confidenceFloor);
    const estimates = { small: { latency: 310, cost: 0.0008 }, balanced: { latency: 760, cost: 0.0032 }, reasoning: { latency: 1840, cost: 0.012 }, not_found: { latency: 180, cost: 0 } } as const;
    const estimate = estimates[route];
    return <div className="engine-demo">
      <p className="eyebrow">TOY SCENARIO · {scenario.title}</p><p className="engine-explainer">{scenario.prompt}</p>
      <label className="demo-select-label" htmlFor="route-task">Task fixture</label>
      <select id="route-task" className="demo-select" value={task.id} onChange={(event) => setTaskId(event.target.value)}>{scenario.tasks.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <label htmlFor="confidence-floor">Minimum confidence <output>{confidenceFloor.toFixed(2)}</output><input id="confidence-floor" type="range" min="0.2" max="0.9" step="0.01" value={confidenceFloor} onChange={(event) => setConfidenceFloor(Number(event.target.value))}/></label>
      <dl className="engine-state-table" aria-label="Task routing decision"><div><dt>Route</dt><dd>{route.replace("_", " ")}</dd></div><div><dt>Fixture confidence</dt><dd>{task.confidence.toFixed(2)}</dd></div><div><dt>Illustrative latency</dt><dd>{estimate.latency} ms</dd></div><div><dt>Illustrative cost</dt><dd>${estimate.cost.toFixed(4)}</dd></div><div><dt>Expected route</dt><dd>{task.expectedRoute.replace("_", " ")}</dd></div></dl>
      <div className="demo-action-stack"><button className="demo-toggle" onClick={() => { setTaskId(scenario.tasks[0].id); setConfidenceFloor(0.5); }}>↺ Reset controls</button></div>
      <p className="engine-explainer">Toy route profiles make the quality/latency/cost trade-off visible. The values are illustrative, not provider benchmarks or a recommendation.</p>
    </div>;
  }

  const request = scenario.requests[requestIndex];
  const cache = advancePromptCache(scenario, seenPrefixes, request.id);
  const advance = () => {
    if (request.stablePrefixKey) setSeenPrefixes((prefixes) => [...new Set([...prefixes, request.stablePrefixKey as string])]);
    setRequestIndex((index) => Math.min(index + 1, scenario.requests.length - 1));
  };
  const reset = () => { setRequestIndex(0); setSeenPrefixes([]); };
  return <div className="engine-demo">
    <p className="eyebrow">TOY SCENARIO · {scenario.title}</p><p className="engine-explainer">{scenario.prompt}</p>
    <dl className="engine-state-table" aria-label="Prompt cache request"><div><dt>Request</dt><dd>{requestIndex + 1}/{scenario.requests.length} · {request.label}</dd></div><div><dt>Cache</dt><dd className={cache?.hit ? "state-good" : ""}>{cache?.hit ? "Prefix hit" : "Cold/miss"}</dd></div><div><dt>Matching prefix</dt><dd>{cache?.matchingPrefixTokens ?? 0} / {scenario.cacheMinimumTokens} token minimum</dd></div><div><dt>Illustrative total prompt size</dt><dd>{cache?.totalTokens ?? 0} tokens</dd></div></dl>
    <div className="demo-action-stack"><button className="demo-primary" onClick={advance} disabled={requestIndex >= scenario.requests.length - 1}>Process next request →</button><button className="demo-toggle" onClick={reset}>↺ Reset request sequence</button></div>
    <p className="engine-explainer">The prefix keys and minimum are a deterministic teaching model. Providers differ in cache rules, retention, pricing, and telemetry; this does not measure a provider cache.</p>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric-card"><span>{label}</span><strong>{value}</strong></div>;
}
