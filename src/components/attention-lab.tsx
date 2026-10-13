"use client";

import { useMemo, useState } from "react";
import { toyAttention } from "@/lib/toy-models";
import { TokenSamplingLab } from "@/components/token-sampling-lab";
import type { AttentionScenario } from "@/content/visual-scenario-types";

const galleryWords = ["The", "engineer", "placed", "the", "book", "on", "the", "table", "because", "it", "was", "unstable"];

export function AttentionLab({ initialMode = "attention", scenario }: { initialMode?: "tokens" | "attention"; scenario?: AttentionScenario }) {
  const [mode, setMode] = useState<"tokens" | "attention">(initialMode);
  const attentionScenario = scenario?.kind === "attention-mechanism" ? scenario : undefined;
  const words = attentionScenario?.tokens ?? galleryWords;
  const [query, setQuery] = useState(attentionScenario?.defaultQueryIndex ?? 9);
  const [masked, setMasked] = useState(attentionScenario?.defaultCausalMask ?? true);
  const result = useMemo(() => toyAttention(query, masked), [query, masked]);
  const maxWeight = Math.max(...result.weights);
  const highestIndex = result.weights.indexOf(maxWeight);

  return (
    <section className="attention-lab" aria-label={mode === "tokens" ? "Tokens and sampling lab" : "Attention lab"}>
      <div className="lab-mode-tabs" role="group" aria-label="Choose a token or attention experiment">
        <button type="button" aria-pressed={mode === "tokens"} onClick={() => setMode("tokens")}>Tokens &amp; sampling</button>
        <button type="button" aria-pressed={mode === "attention"} onClick={() => setMode("attention")}>Attention</button>
      </div>
      <div hidden={mode !== "tokens"}><TokenSamplingLab scenario={scenario?.kind === "token-sampling" ? scenario : undefined} /></div>
      <div hidden={mode !== "attention"}>
        <div className="lab-head"><div><span className="eyebrow">{attentionScenario ? `TOY SCENARIO · ${attentionScenario.title}` : "INTERACTIVE MODEL · TOY EXAMPLE"}</span><h2 id="lab-heading">Where does “{words[query]}” look?</h2></div><span className="lab-step">02 <i>/</i> 03</span></div>
        <p className="lab-intro">{attentionScenario?.prompt ?? "Select a token to inspect scaled query-key scores, normalized weights, and the weighted value result. The vectors are fixed teaching values, not learned model parameters."}</p>
        <div className="sentence-panel">
          <div className="sentence-label">INPUT SEQUENCE <span>{words.length} TOY TOKENS</span></div>
          <div className="token-row" role="group" aria-label="Choose a query token">
            {words.map((word, index) => <button key={`${word}-${index}`} className={`token ${query === index ? "token-selected" : ""} ${masked && index > query ? "token-masked" : ""}`} onClick={() => setQuery(index)} aria-pressed={query === index} aria-label={`Select token ${index + 1}: ${word}`}><span>{word}</span><small>{index}</small></button>)}
          </div>
          <div className="query-caption"><span className="query-dot"></span> Query: <strong>“{words[query]}”</strong><span className="caption-muted">· select any token</span></div>
        </div>
        <div className="weight-panel">
          <div className="weight-heading"><div><span className="eyebrow">ATTENTION DISTRIBUTION</span><p>scaled Q·K scores → mask → softmax weights</p></div><button className={`mask-toggle ${masked ? "is-on" : ""}`} onClick={() => setMasked(!masked)} aria-pressed={masked}><span className="toggle-track"><i></i></span><span>Causal mask</span></button></div>
          <div className="weight-bars" role="list" aria-label={`Normalized attention weights for ${words[query]}. The highest weight is on ${words[highestIndex]}; weights sum to ${result.weights.reduce((sum, value) => sum + value, 0).toFixed(2)}.`}>
            {words.map((word, index) => {
              const value = result.weights[index];
              const barHeight = value === 0 ? 0 : Math.max(value / maxWeight * 100, 5);
              return <div key={`bar-${index}`} role="listitem" aria-label={`${word}, position ${index}, attention weight ${value.toFixed(2)}${masked && index > query ? ", masked future position" : ""}`} className={`weight-column ${index === query ? "weight-query" : ""} ${masked && index > query ? "weight-hidden" : ""}`}><span className="weight-value">{value.toFixed(2)}</span><div className="bar-track" aria-hidden="true"><i style={{ height: `${barHeight.toFixed(4)}%` }}></i></div><span className="weight-word">{word}</span></div>;
            })}
          </div>
          <div className="output-callout"><span className="output-icon">Σ</span><p><strong>Weighted value mixture.</strong> The context vector is <code>[{result.context[0].toFixed(2)}, {result.context[1].toFixed(2)}]</code>. Normalized weights sum to <code>{result.weights.reduce((sum, value) => sum + value, 0).toFixed(2)}</code>.</p></div>
        </div>
        <div className="lab-controls"><span><kbd>Tab</kbd> through tokens <kbd>Enter</kbd> to select</span><button onClick={() => { setQuery(attentionScenario?.defaultQueryIndex ?? 9); setMasked(attentionScenario?.defaultCausalMask ?? true); }}>↺ Reset experiment</button></div>
        <p className="visual-note">Toy Q/K/V vectors make the calculation inspectable. Causal masking excludes future positions before softmax; the remaining weights are normalized.</p>
      </div>
    </section>
  );
}
