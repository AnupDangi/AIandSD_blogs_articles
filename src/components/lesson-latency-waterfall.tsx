"use client";

import { useState } from "react";
import type { ProductionTabletopScenario } from "@/content/visual-scenario-types";
import { calculateCriticalPath, type WaterfallSpan } from "@/lib/latency-waterfall";

export function LessonLatencyWaterfall({ scenario }: { scenario: ProductionTabletopScenario }) {
  const [toolBDependsOnA, setToolBDependsOnA] = useState(false);
  const result = calculateCriticalPath(scenario, !toolBDependsOnA);
  const scaleMs = Math.max(result.sequentialMs, result.candidateMs);

  return <div className="engine-demo">
    <p className="eyebrow">TOY SCENARIO · {scenario.title}</p>
    <p className="demo-question">{scenario.prompt}</p>
    <label className="demo-toggle" htmlFor="latency-tool-dependency">
      <input id="latency-tool-dependency" type="checkbox" checked={toolBDependsOnA} onChange={(event) => setToolBDependsOnA(event.target.checked)} />
      {scenario.secondTool.label} depends on {scenario.firstTool.label}
    </label>
    <div className="metric-grid" aria-label="Analytical pre-generation estimates">
      <Metric label="Sequential estimate" value={formatSeconds(result.sequentialMs)} />
      <Metric label="Candidate estimate" value={formatSeconds(result.candidateMs)} />
      <Metric label="Estimated time saved" value={formatSeconds(result.savedMs)} />
    </div>
    <div className="waterfall-comparison" aria-label="Sequential and candidate latency timelines">
      <WaterfallLane title="Sequential baseline" spans={result.sequentialSpans} totalMs={result.sequentialMs} scaleMs={scaleMs} />
      <WaterfallLane title={toolBDependsOnA ? "Dependent candidate" : "Parallel candidate"} spans={result.candidateSpans} totalMs={result.candidateMs} scaleMs={scaleMs} />
    </div>
    <p className={`waterfall-decision ${result.parallelizationValid ? "state-good" : "state-warning"}`} role="status">
      {result.parallelizationValid
        ? "Parallel schedule is valid only under the stated independent-tool assumption."
        : `${scenario.secondTool.label} needs ${scenario.firstTool.label}’s result, so the candidate follows the same critical path as the sequential baseline.`}
    </p>
    <button className="demo-toggle" onClick={() => setToolBDependsOnA(false)}>↺ Reset scenario</button>
    <p className="engine-explainer">These are analytical pre-generation estimates from the lesson example, not measured TTFT or end-to-end p95. Real scheduling adds queue and coordination overhead; verify trace spans and task quality before adopting a change.</p>
  </div>;
}

function WaterfallLane({ title, spans, totalMs, scaleMs }: { title: string; spans: WaterfallSpan[]; totalMs: number; scaleMs: number }) {
  return <section className="waterfall-lane" aria-label={`${title}, total ${formatSeconds(totalMs)}`}>
    <header><h4>{title}</h4><strong>{formatSeconds(totalMs)}</strong></header>
    <div className="waterfall-axis" aria-hidden="true"><span>0 s</span><span>{formatSeconds(scaleMs)}</span></div>
    <div className="waterfall-rows" role="list">
      {spans.map((span) => {
        const left = span.startMs / scaleMs * 100;
        const width = (span.endMs - span.startMs) / scaleMs * 100;
        return <div className="waterfall-row" role="listitem" key={span.id} aria-label={`${span.label}: ${formatSeconds(span.startMs)} to ${formatSeconds(span.endMs)}`}>
          <span className="waterfall-label">{span.label}</span>
          <div className="waterfall-track"><span className="waterfall-bar" style={{ left: `${left}%`, width: `${width}%` }} /></div>
          <span className="waterfall-time">{formatSeconds(span.endMs - span.startMs)}</span>
        </div>;
      })}
      <div className="waterfall-row waterfall-generation" role="listitem" aria-label={`Generation can begin at ${formatSeconds(totalMs)}`}>
        <span className="waterfall-label">Generation starts</span>
        <div className="waterfall-track"><span className="waterfall-start-marker" style={{ left: `${totalMs / scaleMs * 100}%` }} /></div>
        <span className="waterfall-time">{formatSeconds(totalMs)}</span>
      </div>
    </div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="engine-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function formatSeconds(milliseconds: number) {
  return `${(milliseconds / 1000).toFixed(1)} s`;
}
