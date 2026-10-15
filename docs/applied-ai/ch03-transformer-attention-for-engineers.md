# Chapter 03 — Transformer Attention for Engineers

*Enough internals to reason about context and inference*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 03.*

## Learning outcomes

- Trace the query/key/value attention calculation.
- Explain what softmax weights do in a toy example.
- Relate sequence length to attention computation without treating weights as explanations.

## Before you begin

Chapter 2; vectors, matrix multiplication, and softmax at an introductory level.

## Why this matters

You do not need to train a frontier model to engineer AI applications, but attention, residual blocks, and context dependence explain practical constraints in retrieval, prompt design, and inference serving.

## Visual model

The lesson illustration pairs a selected token with the positions it can use under causal masking. Use it as an analogy for visibility; the attention simulation shows the actual toy Q/K/V calculation, not a transformer trace.

## Try the simulation

Open lesson `ai-03` and select token index 2, **placed**, in the attention visual. Predict which later token positions must have zero weight when **Causal mask** is on. Turn the mask off and on, then compare the displayed weights, their sum, and the weighted value vector. The fixed Q/K/V values are for arithmetic practice; the simulation does not run a transformer.

## Concepts to retain

### Embeddings

Tokens become vectors.

### Attention

Each token mixes information from other tokens using learned relevance scores.

### Residual stack

Repeated attention and MLP (multilayer perceptron) blocks transform representations.

## How it works

1. Project hidden states into Q, K, and V.
2. Compute similarity scores `QKᵀ`.
3. Scale by `√dₖ` (dₖ is the per-head key dimension).
4. In an autoregressive decoder, apply a causal mask to block each position from attending to future positions.
5. Apply softmax to obtain attention weights over the unmasked positions.
6. Use the weights to mix values, then continue through residual blocks.

## Worked example

For one query and two visible keys, scores `[2, 0]` yield softmax weights about `[0.881, 0.119]`. The output is weighted toward `v₁`, while still including `v₂`. For a causal decoder at position 2, a future position’s score is masked before softmax, so its weight is zero. These weights describe this calculation; they are not a guaranteed explanation of a model’s behavior.

## Implementation sketch (pseudocode)

```ts
let scores = matmul(Q, transpose(K)).map((row) => row.map((x) => x / Math.sqrt(dK)));
scores = applyCausalMask(scores); // blocked future positions become -Infinity
const weights = scores.map(softmax); // softmax over each row
const output = matmul(weights, V);
```

This is an illustrative pseudocode sketch, not a runnable command. Placeholder APIs or model operations are conceptual; `matmul`, `transpose`, and `softmax` are helpers you would write for the lab.

## What to measure

- Attention matrix dimensions for the chosen sequence length.
- How the output changes when one key/value changes.
- Memory and runtime as toy sequence length grows.

## Failure modes to reason about

- Treating attention weights as guaranteed explanations.
- Assuming longer context is free.
- Confusing training-time architecture with application-time prompting.
- Ignoring position and recency effects in long inputs.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Represent three query/key/value vectors as plain `number[][]` arrays and compute scaled dot-product attention using `Math.sqrt` and loops.
- Apply a causal mask before softmax so a position cannot attend to a future position.
- Print the weights and verify each unmasked row sums to approximately 1 while masked future positions have weight 0.
- No numeric library or trained model is required; label the result as a toy attention calculation.

## Course project — milestone 1: Model boundary

**Task:** Compare the attention lesson’s toy causal mask with the boundary in your own TypeScript project: attention is learned and happens inside the model, while your boundary is deterministic code. In your project, define the typed answer contract (for example `Answer` with a `text` field and a `citations` array of source IDs) and a `validateAnswer(answer, allowedSourceIds)` function that throws a typed error when a citation is not in the allowed set. Write a Vitest or `node --test` test that builds an answer citing a source ID the request did not allow and asserts that `validateAnswer` throws that error. Add a second test where every citation is allowed and assert it returns the answer unchanged.

**Acceptance check:** You can explain that the attention simulation is a toy model and that correctness in your project here comes from deterministic validation, not learned attention. The forged-citation test fails if you remove the allowed-set check, and a passing validator still does not show that the cited source supports the text.

### Recall without notes

- Explain the roles of Q, K, and V.
- Describe why scores are scaled before softmax.
- State one limitation of interpreting attention weights.

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)
- [The Annotated Transformer](https://nlp.seas.harvard.edu/annotated-transformer/)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
