"use client";

import { useState } from "react";

const sketches = {
  memory: {
    label: "Keep state only in an in-memory agent loop",
    summary: "A process crash loses the current step and evidence reference.",
    nodes: ["Learner request", "In-memory coordinator", "Retrieve evidence", "Worker crash", "Restart from request"],
    edges: ["starts", "loads evidence", "loses process state", "no checkpoint"],
  },
  durable: {
    label: "Persist bounded state and idempotent step results",
    summary: "Persist the step and evidence reference before continuing; reuse an idempotency key after restart.",
    nodes: ["Learner request", "Bounded coordinator", "Retrieve evidence", "Worker crash", "Resume with same key"],
    edges: ["starts", "stores evidence reference", "crash loses process only", "resumes from checkpoint"],
  },
  stateless: {
    label: "Use one stateless provider request per user turn",
    summary: "A single provider call has no durable record of the retrieval or downstream write.",
    nodes: ["Learner request", "Provider call", "Retrieve evidence", "Worker crash", "Restart full operation"],
    edges: ["starts", "issue a separate provider request", "loses process state", "may repeat work"],
  },
} as const;

type SketchId = keyof typeof sketches;

export function LessonDiagramSketch() {
  const [sketchId, setSketchId] = useState<SketchId>("durable");
  const [focusedStep, setFocusedStep] = useState(0);
  const sketch = sketches[sketchId];

  function chooseSketch(next: SketchId) {
    setSketchId(next);
    setFocusedStep(0);
  }

  return <section className="lesson-diagram-sketch" aria-labelledby="diagram-sketch-title">
    <div className="diagram-sketch-heading"><span className="eyebrow">EXPLAIN VISUALLY · AUTHORED SKETCH</span><span className="toy-label">No model call</span></div>
    <h3 id="diagram-sketch-title">Where does the workflow state live?</h3>
    <p className="engine-explainer">Choose an architecture to redraw the same request path. Select a step in the sketch or the text list to inspect it; the ordered text below is equivalent to the sketch.</p>
    <fieldset className="diagram-sketch-options">
      <legend>Architecture</legend>
      {(Object.keys(sketches) as SketchId[]).map((id) => <label key={id}>
        <input type="radio" name="diagram-architecture" value={id} checked={sketchId === id} onChange={() => chooseSketch(id)} />
        {sketches[id].label}
      </label>)}
    </fieldset>
    <div className="diagram-sketch-canvas">
      <svg viewBox="0 0 660 340" role="img" aria-labelledby="diagram-svg-title diagram-svg-desc">
        <title id="diagram-svg-title">{`${sketch.label} request path`}</title>
        <desc id="diagram-svg-desc">A vertical flow from the learner request through each system step to the outcome. Select a numbered step in the text alternative for details.</desc>
        <defs><marker id="diagram-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="currentColor" strokeWidth="1.5" /></marker></defs>
        {sketch.nodes.slice(0, 5).map((node, index) => {
          const y = 16 + index * 62;
          const active = focusedStep === index;
          return <g key={`${sketchId}-${node}`} className={active ? "diagram-node diagram-node-active" : "diagram-node"} onClick={() => setFocusedStep(index)}>
            {index > 0 && <path className="diagram-edge" d={`M330 ${y - 21} L330 ${y - 7}`} markerEnd="url(#diagram-arrow)" />}
            <rect x="145" y={y} width="370" height="42" rx="4" />
            <circle cx="169" cy={y + 21} r="11" />
            <text x="169" y={y + 25} textAnchor="middle">{index + 1}</text>
            <text className="diagram-node-label" x="190" y={y + 26}>{node}</text>
          </g>;
        })}
      </svg>
    </div>
    <ol className="diagram-sketch-steps" aria-label="Diagram text equivalent">
      {sketch.nodes.map((node, index) => <li key={`${sketchId}-${node}`}>
        <button type="button" aria-pressed={focusedStep === index} onClick={() => setFocusedStep(index)}>
          <span>{String(index + 1).padStart(2, "0")}</span><strong>{node}</strong>
          {index < sketch.edges.length && <small>{sketch.edges[index]} →</small>}
        </button>
      </li>)}
    </ol>
    <p className="diagram-sketch-summary" aria-live="polite">{sketch.summary}</p>
    <p className="diagram-sketch-note">This is a fixed teaching sketch, not a production architecture recommendation. All labels come from authored local fixtures; nothing is sent to an AI provider.</p>
  </section>;
}
