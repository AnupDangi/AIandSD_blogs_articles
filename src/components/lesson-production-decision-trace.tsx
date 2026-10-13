"use client";

import { useState } from "react";
import type { ProductionTabletopDecisionScenario } from "@/content/visual-scenario-types";

export function LessonProductionDecisionTrace({ scenario }: { scenario: ProductionTabletopDecisionScenario }) {
  const [optionId, setOptionId] = useState(scenario.options[0]?.id ?? "");
  const [predictionId, setPredictionId] = useState("");
  const [step, setStep] = useState(0);
  const option = scenario.options.find(({ id }) => id === optionId) ?? scenario.options[0];
  const complete = step >= option.transitions.length;
  const selectedPrediction = option.predictions.find(({ id }) => id === predictionId);
  const matchedPrediction = predictionId === option.expectedPrediction;
  const nextTransition = option.transitions[step];

  function reset(nextOptionId = optionId) {
    setOptionId(nextOptionId);
    setPredictionId("");
    setStep(0);
  }

  return <section className="engine-demo" aria-labelledby="production-decision-title">
    <p className="eyebrow">TOY SCENARIO · {scenario.title}</p>
    <h3 id="production-decision-title">{scenario.controlPrompt}</h3>
    <p className="engine-explainer">{scenario.prompt}</p>

    <label className="demo-select-label" htmlFor="production-policy">{scenario.controlLabel}</label>
    <select
      className="demo-select"
      id="production-policy"
      value={option.id}
      onChange={(event) => reset(event.target.value)}
    >
      {scenario.options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
    </select>
    <p className="engine-explainer">{option.context}</p>

    <fieldset className="production-prediction">
      <legend>{scenario.predictionPrompt}</legend>
      {option.predictions.map((prediction) => (
        <label className="demo-toggle" key={prediction.id}>
          <input
            type="radio"
            name="production-prediction"
            value={prediction.id}
            checked={predictionId === prediction.id}
            onChange={() => { setPredictionId(prediction.id); setStep(0); }}
          />
          {prediction.label}
        </label>
      ))}
    </fieldset>

    {selectedPrediction && <p className="engine-state-table" aria-live="polite">Your prediction: <strong>{selectedPrediction.label}</strong></p>}

    <div className="decision-progress" role="status" aria-live="polite" aria-atomic="true">
      <div><span className="eyebrow">OBSERVED TRACE</span><strong>{step} / {option.transitions.length} steps</strong></div>
      <progress value={step} max={option.transitions.length} aria-label="Observed scenario transitions" />
      <p>{complete ? "Trace complete · compare the observed outcome with your prediction." : nextTransition ? `Next: ${nextTransition.label}` : "Predict first, then advance one transition at a time."}</p>
    </div>

    <div className="tabletop-path" aria-label="Observed system transitions" role="list">
      {option.transitions.slice(0, step).map((transition, index) => (
        <div className="tabletop-recovered decision-transition" key={transition.id} role="listitem">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <div><strong>{transition.label}</strong><p>{transition.observation}</p></div>
        </div>
      ))}
    </div>

    {complete && <div className={`tabletop-status ${matchedPrediction ? "state-good" : "state-warning"}`} aria-live="polite">
      <span>{matchedPrediction ? "PREDICTION MATCHED" : "COMPARE YOUR PREDICTION"}</span>
      <strong>{option.result}</strong>
      <p>{option.explanation}</p>
      <p><strong>Observed outcome:</strong> {option.predictions.find(({ id }) => id === option.expectedPrediction)?.label}</p>
    </div>}

    <div className="demo-action-stack">
      <button
        className="demo-primary"
        type="button"
        disabled={!predictionId || complete}
        onClick={() => setStep((current) => Math.min(current + 1, option.transitions.length))}
      >
        {complete ? "Scenario complete" : step === 0 ? "Run next transition →" : "Advance one transition →"}
      </button>
      <button className="demo-toggle" type="button" onClick={() => reset()}>↺ Reset scenario</button>
    </div>
    <p className="engine-explainer">This deterministic trace is an analytical teaching model. Its timings and outcomes are authored fixtures, not production measurements. The transition list is the text equivalent of the visual trace; it works with reduced motion because no motion is required.</p>
  </section>;
}
