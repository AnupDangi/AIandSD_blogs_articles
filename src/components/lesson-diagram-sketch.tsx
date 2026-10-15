"use client";

import { useState } from "react";
import { getDiagramSketch } from "@/lib/diagram-sketches";

const ROW = 62;

/** Renders an authored sketch for one lesson from curriculum/diagram-sketches.json. Draws nothing without a manifest entry. */
export function LessonDiagramSketch({ lessonId }: { lessonId: string }) {
  const sketch = getDiagramSketch(lessonId);
  if (!sketch) return null;
  return <SketchBody key={lessonId} lessonId={lessonId} sketch={sketch} />;
}

function SketchBody({ lessonId, sketch }: { lessonId: string; sketch: NonNullable<ReturnType<typeof getDiagramSketch>> }) {
  const [optionId, setOptionId] = useState((sketch.options.find((item) => item.default) ?? sketch.options[0]).id);
  const [focusedStep, setFocusedStep] = useState(0);
  const option = sketch.options.find((item) => item.id === optionId) ?? sketch.options[0];
  const height = 16 + option.nodes.length * ROW - 20;
  const titleId = `diagram-sketch-title-${lessonId}`;

  function choose(next: string) {
    setOptionId(next);
    setFocusedStep(0);
  }

  return <section className="lesson-diagram-sketch" aria-labelledby={titleId}>
    <div className="diagram-sketch-heading"><span className="eyebrow">EXPLAIN VISUALLY · AUTHORED SKETCH</span><span className="toy-label">No model call</span></div>
    <h3 id={titleId}>{sketch.title}</h3>
    <p className="engine-explainer">{sketch.intro}</p>
    <fieldset className="diagram-sketch-options">
      <legend>Architecture</legend>
      {sketch.options.map((item) => <label key={item.id}>
        <input type="radio" name={`diagram-architecture-${lessonId}`} value={item.id} checked={optionId === item.id} onChange={() => choose(item.id)} />
        {item.label}
      </label>)}
    </fieldset>
    <div className="diagram-sketch-canvas">
      <svg viewBox={`0 0 660 ${height}`} role="img" aria-labelledby={`diagram-svg-title-${lessonId} diagram-svg-desc-${lessonId}`}>
        <title id={`diagram-svg-title-${lessonId}`}>{`${option.label} request path`}</title>
        <desc id={`diagram-svg-desc-${lessonId}`}>A vertical flow through each system step to the outcome. Select a numbered step in the text alternative for details.</desc>
        <defs><marker id={`diagram-arrow-${lessonId}`} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="currentColor" strokeWidth="1.5" /></marker></defs>
        {option.nodes.map((node, index) => {
          const y = 16 + index * ROW;
          const active = focusedStep === index;
          return <g key={`${option.id}-${node}`} className={active ? "diagram-node diagram-node-active" : "diagram-node"} onClick={() => setFocusedStep(index)}>
            {index > 0 && <path className="diagram-edge" d={`M330 ${y - 21} L330 ${y - 7}`} markerEnd={`url(#diagram-arrow-${lessonId})`} />}
            <rect x="145" y={y} width="370" height="42" rx="4" />
            <circle cx="169" cy={y + 21} r="11" />
            <text x="169" y={y + 25} textAnchor="middle">{index + 1}</text>
            <text className="diagram-node-label" x="190" y={y + 26}>{node}</text>
          </g>;
        })}
      </svg>
    </div>
    <ol className="diagram-sketch-steps" aria-label="Diagram text equivalent">
      {option.nodes.map((node, index) => <li key={`${option.id}-${node}`}>
        <button type="button" aria-pressed={focusedStep === index} onClick={() => setFocusedStep(index)}>
          <span>{String(index + 1).padStart(2, "0")}</span><strong>{node}</strong>
          {index < option.edges.length && <small>{option.edges[index]} →</small>}
        </button>
      </li>)}
    </ol>
    <p className="diagram-sketch-summary" aria-live="polite">{option.summary}</p>
    <p className="diagram-sketch-note">This is a fixed teaching sketch, not a production architecture recommendation. All labels come from authored local fixtures; nothing is sent to an AI provider.</p>
  </section>;
}
