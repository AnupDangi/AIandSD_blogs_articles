"use client";

import { useMemo, useState } from "react";
import type { TokenSamplingScenario } from "@/content/visual-scenario-types";
import { chooseByProbability, NEXT_TOKEN_CANDIDATES, softmax, tokenizeToy, truncateTopP } from "@/lib/toy-models";

const fallbackPrompt = "An engineer builds reliable tools.";

export function TokenSamplingLab({ scenario }: { scenario?: TokenSamplingScenario }) {
  const candidates = scenario?.candidates ?? NEXT_TOKEN_CANDIDATES;
  const prompt = scenario?.prompt ?? fallbackPrompt;
  const initialTemperature = scenario?.defaultTemperature ?? 1;
  const initialTopP = scenario?.defaultTopP ?? 0.9;
  const [temperature, setTemperature] = useState(initialTemperature);
  const [topP, setTopP] = useState(initialTopP);
  const [sampledToken, setSampledToken] = useState<string | null>(null);
  const tokens = tokenizeToy(prompt);
  const probabilities = useMemo(
    () => softmax(candidates.map(({ logit }) => logit), temperature),
    [candidates, temperature],
  );
  const nucleus = useMemo(() => truncateTopP(probabilities, topP), [probabilities, topP]);

  return <div className="token-sampling-lab">
    <div className="lab-head"><div><span className="eyebrow">{scenario ? `TOY SCENARIO · ${scenario.title}` : "TOKENIZATION & DECODING · TOY EXAMPLE"}</span><h2>From text to a next-token draw</h2></div><span className="lab-step">Sampling lab</span></div>
    <p className="lab-intro">This whitespace-and-punctuation tokenizer and fixed logit list are teaching examples, not a real model tokenizer or model output.</p>
    <div className="sentence-panel">
      <div className="sentence-label">INPUT TEXT <span>{tokens.length} TOY TOKENS</span></div>
      <div className="token-row" role="list" aria-label="Toy tokenizer output">
        {tokens.map((token, index) => <span className="token" role="listitem" key={`${token}-${index}`}><span>{token}</span><small>{index}</small></span>)}
      </div>
    </div>
    <div className="demo-range-grid token-sampling-controls">
      <label htmlFor="toy-temperature">Temperature <output>{temperature.toFixed(2)}</output><input id="toy-temperature" type="range" min="0.35" max="2" step="0.05" value={temperature} onChange={(event) => { setTemperature(Number(event.target.value)); setSampledToken(null); }}/></label>
      <label htmlFor="toy-top-p">Top-p <output>{topP.toFixed(2)}</output><input id="toy-top-p" type="range" min="0.35" max="1" step="0.05" value={topP} onChange={(event) => { setTopP(Number(event.target.value)); setSampledToken(null); }}/></label>
    </div>
    <div className="token-probabilities" role="table" aria-label="Toy next-token probabilities" tabIndex={0}>
      <div className="token-probability-row token-probability-header" role="row"><span role="columnheader">CANDIDATE</span><span role="columnheader">BASE LOGIT</span><span role="columnheader">SOFTMAX</span><span role="columnheader">TOP-P PROBABILITY</span><span role="columnheader">TOP-P SET</span></div>
      {candidates.map((candidate, index) => <div className="token-probability-row" role="row" key={candidate.token}><strong role="cell" data-label="Candidate">{candidate.token}</strong><span role="cell" data-label="Base logit">{candidate.logit.toFixed(1)}</span><span role="cell" data-label="Softmax">{probabilities[index].toFixed(3)}</span><span role="cell" data-label="Top-p probability">{nucleus[index].toFixed(3)}</span><span role="cell" data-label="Top-p set">{nucleus[index] > 0 ? "included" : "filtered"}</span></div>)}
    </div>
    <div className="sample-output"><span className="eyebrow">NEXT TOKEN</span><strong aria-live="polite" aria-atomic="true">{sampledToken ?? "Not sampled yet"}</strong></div>
    <div className="lab-controls"><span>Sampling is stochastic in this toy distribution; reset restores the initial controls.</span><div><button className="demo-primary" onClick={() => setSampledToken(candidates[chooseByProbability(nucleus, Math.random())].token)}>Sample next token</button> <button onClick={() => { setTemperature(initialTemperature); setTopP(initialTopP); setSampledToken(null); }}>↺ Reset</button></div></div>
    <p className="visual-note">Temperature rescales logits before softmax. Top-p retains the smallest highest-probability set that reaches the selected cumulative mass, then renormalizes it.</p>
  </div>;
}
