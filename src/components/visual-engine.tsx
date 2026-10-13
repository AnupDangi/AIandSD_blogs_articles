"use client";

import { useState } from "react";
import { AttentionLab } from "@/components/attention-lab";
import { LessonRequestWorkbench } from "@/components/lesson-request-workbench";
import { LessonAgentWorkflow } from "@/components/lesson-agent-workflow";
import { LessonEvaluationConsole } from "@/components/lesson-evaluation-console";
import { LessonTrustBoundarySandbox } from "@/components/lesson-trust-boundary-sandbox";
import { LessonLatencyWaterfall } from "@/components/lesson-latency-waterfall";
import { LessonProductionDecisionTrace } from "@/components/lesson-production-decision-trace";
import { chunkToySentences, rankToyPassages, retrievalMetrics, RRF_RANK_CONSTANT, type RetrievalStrategy } from "@/lib/toy-retrieval";
import { getRetrievalScenario } from "@/lib/retrieval-scenarios";
import { getLessonVisualScenario, isRequestWorkbenchScenario } from "@/lib/visual-scenarios";
import type { LessonVisualScenario } from "@/content/types";
import type { RetrievalVisualScenario } from "@/content/visual-scenario-types";
import type { InferenceSchedulerScenario } from "@/content/visual-scenario-types";
import { trustBoundaryScenarioManifest } from "@/lib/visual-scenarios";
import { estimateKvCacheBytes, estimateKvCacheBytesPerToken, formatBinaryMemory } from "@/lib/inference-scheduler";

export const visualEngines = [
  { id: "request-workbench", label: "Request workbench", short: "01", description: "Trace model selection, output validation, latency, and estimated cost." },
  { id: "attention", label: "Tokens & attention", short: "02", description: "Inspect a toy attention distribution and see how masking changes visibility." },
  { id: "inference-scheduler", label: "Inference scheduler", short: "03", description: "Compare batching, concurrency, KV memory, queue delay, and prefix reuse." },
  { id: "retrieval-microscope", label: "Retrieval microscope", short: "04", description: "Change chunk size and top-k, then inspect candidate ranks and recall." },
  { id: "agent-state-machine", label: "Agent state machine", short: "05", description: "Advance or interrupt a bounded workflow and inspect how it recovers." },
  { id: "evaluation-console", label: "Evaluation console", short: "06", description: "Change an acceptance threshold and inspect evaluation slices." },
  { id: "trust-boundary-sandbox", label: "Trust-boundary sandbox", short: "07", description: "Trace untrusted text through permissions, review, and evidence checks." },
  { id: "production-tabletop", label: "Production tabletop", short: "08", description: "Inject a production failure and step through its recovery path." },
] as const;

export type VisualEngineId = (typeof visualEngines)[number]["id"];

export function VisualEngine({ visualId, lessonId, sectionId, scenario }: { visualId: string; lessonId?: string; sectionId?: string; scenario?: LessonVisualScenario }) {
  const activeScenario = scenario ?? (lessonId ? getLessonVisualScenario(lessonId) : undefined);
  if (visualId === "attention") return <AttentionLab key={lessonId ?? "gallery"} initialMode={lessonId === "ai-02" ? "tokens" : "attention"} scenario={activeScenario?.engine === "attention" ? activeScenario : undefined} />;
  switch (visualId as VisualEngineId) {
    case "request-workbench": return isRequestWorkbenchScenario(activeScenario) ? <LessonRequestWorkbench key={`${lessonId ?? "gallery"}:${sectionId ?? "gallery"}`} scenario={activeScenario} /> : <RequestWorkbench />;
    case "inference-scheduler": return <InferenceScheduler key={lessonId ?? "gallery"} scenario={activeScenario?.engine === "inference-scheduler" ? activeScenario : undefined} />;
    case "retrieval-microscope": return <RetrievalMicroscope key={`${lessonId ?? "gallery"}:${sectionId ?? "gallery"}`} lessonId={lessonId} scenario={activeScenario?.engine === "retrieval-microscope" ? activeScenario : undefined} />;
    case "agent-state-machine": return activeScenario?.engine === "agent-state-machine" ? <LessonAgentWorkflow key={`${lessonId ?? "gallery"}:${sectionId ?? "gallery"}`} scenario={activeScenario} /> : <AgentStateMachine />;
    case "evaluation-console": return activeScenario?.engine === "evaluation-console" ? <LessonEvaluationConsole key={`${lessonId ?? "gallery"}:${sectionId ?? "gallery"}`} scenario={activeScenario} /> : <EvaluationConsole />;
    case "trust-boundary-sandbox": {
      const trustScenario = activeScenario?.engine === "trust-boundary-sandbox" ? activeScenario : trustBoundaryScenarioManifest["ai-31"];
      return <LessonTrustBoundarySandbox key={lessonId ?? "gallery"} scenario={trustScenario} />;
    }
    case "production-tabletop": {
      if (activeScenario?.engine !== "production-tabletop") return <ProductionTabletop />;
      if (activeScenario.kind === "critical-path") return <LessonLatencyWaterfall key={`${lessonId ?? "gallery"}:${sectionId ?? "gallery"}`} scenario={activeScenario} />;
      return <LessonProductionDecisionTrace key={`${lessonId ?? "gallery"}:${sectionId ?? "gallery"}`} scenario={activeScenario} />;
    }
    default: return <div className="engine-placeholder"><span className="eyebrow">VISUAL LAB</span><p>This lesson’s interactive visual is being prepared.</p></div>;
  }
}

export function VisualEngineGallery() {
  const [active, setActive] = useState<VisualEngineId>("request-workbench");
  const engine = visualEngines.find((item) => item.id === active)!;
  return <section className="engine-gallery"><div className="engine-gallery-heading"><span className="eyebrow">THE INTERACTIVE TOOLKIT</span><h2>Turn the concept into a system<br/><em>you can inspect.</em></h2><p>These reusable visual labs make hidden behavior observable. Each one is a small educational model; real systems may behave differently.</p></div><div className="engine-gallery-layout"><nav className="engine-picker" aria-label="Choose a visual lab">{visualEngines.map((item) => <button key={item.id} className={active === item.id ? "engine-picker-active" : ""} onClick={() => setActive(item.id)} aria-pressed={active === item.id}><span>{item.short}</span>{item.label}<b>↗</b></button>)}</nav><div className="engine-gallery-demo"><div className="engine-gallery-demo-head"><div><span className="eyebrow">{engine.short} / INTERACTIVE MODEL</span><h3>{engine.label}</h3></div><span className="toy-label">TOY EXAMPLE</span></div><p>{engine.description}</p><VisualEngine visualId={active}/></div></div></section>;
}

function RequestWorkbench() {
  const [complexity, setComplexity] = useState(55);
  const [malformed, setMalformed] = useState(false);
  const [impossible, setImpossible] = useState(false);
  const route = complexity > 70 ? "reasoning model" : complexity < 30 ? "small fast model" : "balanced model";
  const latency = complexity > 70 ? 1840 : complexity < 30 ? 420 : 780;
  const cost = (0.001 + complexity * 0.00004).toFixed(3);
  return <div className="engine-demo"><div className="demo-control-row"><label htmlFor="request-complexity">Task complexity <output>{complexity}%</output></label><input id="request-complexity" type="range" min="0" max="100" value={complexity} onChange={(event) => setComplexity(Number(event.target.value))}/></div><div className="demo-action-stack"><button className={`demo-toggle ${malformed ? "demo-toggle-on" : ""}`} onClick={() => setMalformed(!malformed)} aria-pressed={malformed}><span className="demo-check">{malformed ? "✓" : ""}</span> Simulate malformed structured output</button><button className={`demo-toggle ${impossible ? "demo-toggle-on" : ""}`} onClick={() => setImpossible(!impossible)} aria-pressed={impossible}><span className="demo-check">{impossible ? "✓" : ""}</span> Simulate schema-valid but impossible result</button><button className="demo-toggle" onClick={() => { setComplexity(55); setMalformed(false); setImpossible(false); }}>↺ Reset controls</button></div><div className="engine-state-table" role="table" aria-label="Request execution trace"><div role="row"><span role="cell">Route</span><strong role="cell">{route}</strong></div><div role="row"><span role="cell">Validation</span><strong role="cell" className={malformed || impossible ? "state-warning" : "state-good"}>{malformed ? "Rejected · shape/type mismatch" : impossible ? "Schema passes · domain invariant fails" : "Schema and domain checks pass"}</strong></div><div role="row"><span role="cell">Example output</span><strong role="cell">{malformed ? "{ seats: \"many\" }" : impossible ? "{ available: true, seats: -4 }" : "{ available: true, seats: 4 }"}</strong></div><div role="row"><span role="cell">Estimated latency</span><strong role="cell">{latency.toLocaleString()} ms</strong></div><div role="row"><span role="cell">Estimated cost</span><strong role="cell">${cost} / request</strong></div></div><p className="engine-explainer">The toy schema check covers output shape and types; the domain invariant rejects an impossible negative seat count. Routing, cost, and latency are illustrative estimates.</p></div>;
}

function InferenceScheduler({ scenario }: { scenario?: InferenceSchedulerScenario }) {
  const [batch, setBatch] = useState(scenario?.defaultBatchSize ?? 4);
  const [concurrency, setConcurrency] = useState(scenario?.defaultConcurrency ?? 6);
  const [reuse, setReuse] = useState(scenario?.defaultPrefixReuse ?? true);
  const [sequenceTokens, setSequenceTokens] = useState(scenario?.defaultSequenceTokens ?? 8192);
  const [activeSequences, setActiveSequences] = useState(scenario?.defaultActiveSequences ?? 1);
  const config: InferenceSchedulerScenario = scenario ?? {
    engine: "inference-scheduler", title: "Illustrative KV cache estimate", prompt: "Toy assumptions for comparing serving controls.",
    layers: 32, kvHeads: 8, headDimension: 128, bytesPerValue: 2,
    defaultSequenceTokens: 8192, defaultActiveSequences: 1, defaultBatchSize: 4, defaultConcurrency: 6, defaultPrefixReuse: true,
  };
  const queue = Math.max(1, Math.round(24 / concurrency));
  const throughput = batch * concurrency * (reuse ? 1.25 : 1);
  const kvBytesPerToken = estimateKvCacheBytesPerToken(config);
  const kvCacheBytes = estimateKvCacheBytes(config, sequenceTokens, activeSequences);
  return <div className="engine-demo">
    {scenario && <><p className="eyebrow">TOY SCENARIO · {scenario.title}</p><p className="engine-explainer">{scenario.prompt}</p></>}
    <div className="demo-range-grid">
      <label htmlFor="batch-size">Batch size <output>{batch}</output><input id="batch-size" type="range" min="1" max="12" value={batch} onChange={(e) => setBatch(Number(e.target.value))}/></label>
      <label htmlFor="concurrency">Concurrent requests <output>{concurrency}</output><input id="concurrency" type="range" min="1" max="16" value={concurrency} onChange={(e) => setConcurrency(Number(e.target.value))}/></label>
      <label htmlFor="sequence-tokens">Tokens per sequence <output>{sequenceTokens.toLocaleString()}</output><input id="sequence-tokens" type="range" min="512" max="16384" step="512" value={sequenceTokens} onChange={(e) => setSequenceTokens(Number(e.target.value))}/></label>
      <label htmlFor="active-sequences">Active sequences <output>{activeSequences}</output><input id="active-sequences" type="range" min="1" max="8" value={activeSequences} onChange={(e) => setActiveSequences(Number(e.target.value))}/></label>
    </div>
    <button className={`demo-toggle ${reuse ? "demo-toggle-on" : ""}`} onClick={() => setReuse(!reuse)} aria-pressed={reuse}><span className="demo-check">{reuse ? "✓" : ""}</span> Reuse shared prompt prefix</button>
    <div className="demo-action-stack"><button className="demo-toggle" onClick={() => { setBatch(scenario?.defaultBatchSize ?? 4); setConcurrency(scenario?.defaultConcurrency ?? 6); setReuse(scenario?.defaultPrefixReuse ?? true); setSequenceTokens(scenario?.defaultSequenceTokens ?? 8192); setActiveSequences(scenario?.defaultActiveSequences ?? 1); }}>↺ Reset controls</button></div>
    <div className="metric-grid"><Metric label="Toy queue delay" value={`${queue * 18} ms`}/><Metric label="Relative throughput index" value={`${throughput.toFixed(0)} units`}/><Metric label="KV cache estimate" value={formatBinaryMemory(kvCacheBytes)}/></div>
    <div className="queue-visual" role="img" aria-label={`${batch} requests per batch, ${concurrency} concurrent slots, ${activeSequences} active ${activeSequences === 1 ? "sequence" : "sequences"} of ${sequenceTokens.toLocaleString()} tokens`}><span>Incoming requests</span><div className="queue-dots">{Array.from({ length: Math.min(batch, 10) }, (_, i) => <i key={i}></i>)}</div><b>→</b><div className="queue-worker">BATCH<br/><strong>{batch}</strong></div><b>→</b><span>GPU slots × {concurrency}</span></div>
    <p className="engine-explainer">At these settings, the estimate is <strong>{formatBinaryMemory(kvBytesPerToken)}</strong> per token across both K and V, or <strong>{formatBinaryMemory(kvCacheBytes)}</strong> for {activeSequences} active sequence{activeSequences === 1 ? "" : "s"}. It counts KV tensors only; model weights, allocator overhead, and architecture-specific sharing are excluded. Queue delay and the relative throughput index are toy scheduling values, not serving measurements.</p>
  </div>;
}

function RetrievalMicroscope({ lessonId, scenario: lessonScenario }: { lessonId?: string; scenario?: RetrievalVisualScenario }) {
  const inspectAccess = lessonId === "ai-13";
  const scenario = lessonScenario ?? getRetrievalScenario(lessonId);
  const [chunk, setChunk] = useState(scenario.defaultChunkSize);
  const [topK, setTopK] = useState(scenario.defaultTopK);
  const [strategy, setStrategy] = useState<RetrievalStrategy>("hybrid");
  const [includeStale, setIncludeStale] = useState(false);
  const [includeRestricted, setIncludeRestricted] = useState(false);
  const query = scenario.query;
  const sentences = scenario.sentences;
  const allPassages = chunkToySentences(sentences, chunk);
  const passages = allPassages.filter(({ sourceStatus }) =>
    !inspectAccess || (sourceStatus !== "stale" || includeStale) && (sourceStatus !== "restricted" || includeRestricted)
  );
  const excludedStale = allPassages.filter(({ sourceStatus }) => sourceStatus === "stale" && !includeStale).length;
  const excludedRestricted = allPassages.filter(({ sourceStatus }) => sourceStatus === "restricted" && !includeRestricted).length;
  const ranked = rankToyPassages(query, passages, strategy);
  const effectiveTopK = Math.min(topK, passages.length);
  const selected = ranked.slice(0, effectiveTopK);
  const relevantCount = passages.filter(({ relevant }) => relevant).length;
  const metrics = retrievalMetrics(ranked, relevantCount, effectiveTopK);
  const fusionScore = strategy === "hybrid";

  return <div className="engine-demo">
    <p className="eyebrow" aria-label="Retrieval scenario">TOY SCENARIO · {scenario.title}</p>
    <p className="demo-question">Query: <strong>“{query}”</strong></p>
    <div className="demo-range-grid">
      <label htmlFor="chunk-size">Maximum chunk size <output>{chunk} {chunk === 1 ? "sentence" : "sentences"}</output>
        <input id="chunk-size" type="range" min="1" max="5" value={chunk} onChange={(e) => setChunk(Number(e.target.value))}/>
      </label>
      <label htmlFor="top-k">Retrieved passages <output>top {effectiveTopK}</output>
        <input id="top-k" type="range" min="1" max={Math.max(passages.length, 1)} value={Math.max(effectiveTopK, 1)} onChange={(e) => setTopK(Number(e.target.value))}/>
      </label>
    </div>
    {inspectAccess && <div className="demo-action-stack">
      <label className="demo-toggle"><input type="checkbox" checked={includeStale} onChange={(e) => setIncludeStale(e.target.checked)}/> Include stale source (normally excluded)</label>
      <label className="demo-toggle"><input type="checkbox" checked={includeRestricted} onChange={(e) => setIncludeRestricted(e.target.checked)}/> Include restricted source (normally excluded)</label>
    </div>}
    <label className="demo-select-label" htmlFor="retrieval-strategy">Retrieval and ranking</label>
    <select id="retrieval-strategy" className="demo-select" value={strategy} onChange={(e) => setStrategy(e.target.value as RetrievalStrategy)}>
      <option value="lexical">Lexical overlap</option>
      <option value="vector">Toy feature-hashed vector</option>
      <option value="hybrid">Reciprocal-rank fusion</option>
      <option value="rerank">Hybrid + coverage/order rerank</option>
    </select>
    {fusionScore && <p className="engine-explainer">Fusion score = sum of 1 / ({RRF_RANK_CONSTANT} + rank) over lexical and toy-vector lists; ranks start at 1.</p>}
    {inspectAccess && <p className="engine-explainer" role="status">Eligible: {passages.length}/{allPassages.length} chunks · excluded: {excludedStale} stale, {excludedRestricted} restricted. Filtering occurs before ranking.</p>}
    <div className="retrieval-results">
      <div className="results-heading"><span>RANKED EVIDENCE</span><span>SCORE / LABEL</span></div>
      {selected.length ? selected.map((item, i) => <div className="retrieval-result" key={item.id}>
        <span>{String(i + 1).padStart(2, "0")}</span>
        <p>{item.text}{inspectAccess && item.sourceStatus && <small> · {item.sourceStatus} source</small>}</p>
        <b>{item.score.toFixed(fusionScore ? 5 : 3)}{item.relevant ? " · relevant" : ""}</b>
      </div>) : <p className="empty-result">No eligible passages remain under the current freshness and access filters.</p>}
    </div>
    <div className="retrieval-summary">
      <span><strong>{metrics.recall.toFixed(2)}</strong> recall@k</span>
      <span><strong>{metrics.precision.toFixed(2)}</strong> precision@k</span>
      <span><strong>{metrics.relevantFound}/{relevantCount}</strong> eligible relevant chunks found</span>
    </div>
    <div className="demo-action-stack"><button className="demo-toggle" onClick={() => { setChunk(scenario.defaultChunkSize); setTopK(scenario.defaultTopK); setStrategy("hybrid"); setIncludeStale(false); setIncludeRestricted(false); }}>↺ Reset controls</button></div>
    <p className="engine-explainer">Chunk size groups sentences without crossing toy source-status boundaries. Relevance labels are fixed for this query. Vector scores use deterministic feature hashing, not semantic embeddings. Fusion uses candidate ranks; reranking uses token coverage and order.{inspectAccess ? " The stale and restricted rows intentionally match query words but are unusable evidence. Including either can displace current evidence; this toy toggle does not implement real authorization or version checks." : ""}</p>
  </div>;
}

function AgentStateMachine() {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [budget, setBudget] = useState(5);
  const states = ["Accepted", "Plan saved", "Search docs", "Check evidence", "Draft response", "Complete"];
  const current = Math.min(step, states.length - 1);
  const atTerminal = step >= states.length - 1;
  const exhausted = step >= budget && !atTerminal;
  const completed = exhausted ? "Budget exhausted · stopped" : paused ? "Paused · checkpoint saved" : duplicate ? "Duplicate result · ignored" : states[current];
  return <div className="engine-demo"><div className="demo-range-grid"><label htmlFor="agent-budget">Step budget <output>{budget} steps</output><input id="agent-budget" type="range" min="2" max="8" value={budget} onChange={(e) => setBudget(Number(e.target.value))}/></label><div className="demo-action-stack"><button className="demo-toggle" onClick={() => setPaused((value) => !value)} aria-pressed={paused}><span className="demo-check">{paused ? "✓" : ""}</span> {paused ? "Resume from checkpoint" : "Interrupt workflow"}</button><button className="demo-toggle" onClick={() => setDuplicate(!duplicate)} aria-pressed={duplicate}><span className="demo-check">{duplicate ? "✓" : ""}</span> Simulate duplicate tool result</button></div></div><div className="state-flow" aria-label={`Workflow state: ${completed}`} role="list">{states.map((item, index) => <div key={item} className={`state-flow-step ${index < current ? "state-flow-done" : ""} ${index === current ? "state-flow-current" : ""}`} role="listitem"><span>{index < current ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{item}</small></div>)}</div><div className={`state-banner ${paused || exhausted ? "state-banner-warn" : ""}`}><span>WORKFLOW STATE</span><strong>{completed}</strong><p>{paused ? "The checkpoint stays at the interrupted step; resume continues from this exact state." : duplicate ? "Idempotency keys prevent the repeated result from applying twice." : exhausted ? "The step budget is terminal for this run; restart to begin a fresh workflow." : "Each transition is recorded so the workflow can be inspected and resumed."}</p></div><div className="demo-action-stack"><button className="demo-primary" disabled={paused} onClick={() => { if (atTerminal || exhausted) { setStep(0); setPaused(false); } else setStep(step + 1); }}>{atTerminal || exhausted ? "↺ Restart workflow" : "Advance one step →"}</button><button className="demo-toggle" onClick={() => { setStep(0); setPaused(false); setDuplicate(false); }}>↺ Reset workflow</button></div><p className="engine-explainer">This state machine is deterministic. Real workflows also need durable storage, timeout handling, and safe tool permissions.</p></div>;
}

function EvaluationConsole() {
  const [threshold, setThreshold] = useState(0.72);
  const rows = [{ name: "Grounded answers", score: .86, count: 42 }, { name: "Incomplete questions", score: .61, count: 18 }, { name: "Long documents", score: .77, count: 26 }, { name: "Adversarial inputs", score: .48, count: 14 }];
  const passing = rows.filter((row) => row.score >= threshold).length;
  return <div className="engine-demo"><div className="demo-control-row"><label htmlFor="eval-threshold">Minimum acceptable score <output>{threshold.toFixed(2)}</output></label><input id="eval-threshold" type="range" min="0.4" max="0.95" step="0.01" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}/></div><div className="demo-action-stack"><button className="demo-toggle" onClick={() => setThreshold(0.72)}>↺ Reset controls</button></div><div className="eval-summary"><strong>{passing} / {rows.length}</strong><span>slices meet this threshold</span></div><div className="eval-table" role="table" aria-label="Evaluation results by slice"><div className="eval-table-head" role="row"><span role="columnheader">EVALUATION SLICE</span><span role="columnheader">N</span><span role="columnheader">SCORE</span><span role="columnheader">RESULT</span></div>{rows.map((row) => <div className="eval-table-row" role="row" key={row.name}><strong role="cell">{row.name}</strong><span role="cell">{row.count}</span><span role="cell">{row.score.toFixed(2)}</span><span role="cell" className={row.score >= threshold ? "state-good" : "state-warning"}>{row.score >= threshold ? "Pass" : "Review"}</span></div>)}</div><p className="engine-explainer">Averages can hide weak slices. This toy report uses fixed scores to show how a release threshold can expose regressions.</p></div>;
}

function ProductionTabletop() {
  const [failure, setFailure] = useState("provider");
  const [retries, setRetries] = useState(2);
  const [stepped, setStepped] = useState(false);
  const providerTimeout: [string, string, string] = retries > 0
    ? ["Provider timeout", `Retry at most ${retries} times`, "Fallback response · no unsupported citations"]
    : ["Provider timeout", "Retry budget is zero", "Unavailable · no citations"];
  const outcomes: Record<string, [string, string, string]> = {
    provider: providerTimeout,
    once: retries > 0 ? ["First request times out", "Retry within the remaining deadline", "Second request succeeds · preserve attempt trace"] : ["First request times out", "Retry budget is zero", "Unavailable · no citations"],
    permanent: ["Permanent validation error", "Classify as non-retryable", "Return a clear error · do not repeat"],
    candidate: ["Candidate breaches a risk-slice gate", "Halt promotion and alert owner", "Disable candidate · exercise rollback"],
    index: ["Index is stale", "Serve last good snapshot", "Schedule reindex"],
    worker: ["Worker crashed", "Resume checkpoint", "Idempotent completion"],
  };
  const labels: Record<string, string> = { provider: "Provider timeout", once: "Single timeout then recovery", permanent: "Permanent validation failure", candidate: "Canary candidate regression", index: "Stale retrieval index", worker: "Background worker crash" };
  const status = (failure === "provider" || failure === "once") && retries === 0 ? "UNAVAILABLE" : failure === "permanent" ? "FAILED · NO RETRY" : failure === "candidate" ? "PROMOTION HALTED · ROLLBACK" : failure === "index" ? "DEGRADED · LAST GOOD INDEX" : "RECOVERED · TOY SCENARIO";
  return <div className="engine-demo"><label className="demo-select-label" htmlFor="failure-kind">Explore a failure path</label><select id="failure-kind" className="demo-select" value={failure} onChange={(e) => { setFailure(e.target.value); setStepped(false); }}><option value="provider">Provider outage · retry budget</option><option value="once">One timeout then success</option><option value="permanent">Permanent validation error</option><option value="candidate">Candidate release regression</option><option value="index">Stale retrieval index</option><option value="worker">Background worker crash</option></select>{(failure === "provider" || failure === "once") && <div className="demo-control-row"><label htmlFor="retry-count">Retry limit <output>{retries}</output></label><input id="retry-count" type="range" min="0" max="5" value={retries} onChange={(e) => setRetries(Number(e.target.value))}/></div>}<div className="tabletop-path" aria-label={`${labels[failure]} recovery steps`} role="list">{outcomes[failure].map((item, i) => <div key={item} className={`${stepped && i === 0 ? "tabletop-failed" : ""} ${stepped && i > 0 ? "tabletop-recovered" : ""}`} role="listitem"><span>{stepped && i === 0 ? "!" : stepped ? "✓" : String(i + 1).padStart(2, "0")}</span><p>{item}</p>{i < 2 && <i>↓</i>}</div>)}</div><div className="tabletop-status"><span className={stepped ? (status.startsWith("RECOVERED") ? "state-good" : "state-warning") : "state-warning"}>{stepped ? status : "SCENARIO READY"}</span><strong>{stepped ? "Illustrative outcome; verify with the project tests and runbook." : "Choose a failure path, then inspect its expected response."}</strong></div><div className="engine-state-table" role="table" aria-label="Readiness evidence status"><div role="row"><span role="cell">Deterministic local fixtures</span><strong role="cell" className="state-good">Demonstrated locally</strong></div><div role="row"><span role="cell">Hosted identity, telemetry, live provider, rollback</span><strong role="cell" className="state-warning">Unverified here</strong></div></div><button className="demo-primary" aria-label={stepped ? "Reset tabletop scenario to authored defaults" : undefined} onClick={() => setStepped(!stepped)}>{stepped ? "↺ Reset scenario" : "Step through response →"}</button><p className="engine-explainer">A tabletop describes expected behavior; it does not inject a real failure. The local starter and external evidence determine what has actually been tested.</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="engine-metric"><span>{label}</span><strong>{value}</strong></div>; }
