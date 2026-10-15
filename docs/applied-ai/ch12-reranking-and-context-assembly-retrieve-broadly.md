# Chapter 12 — Reranking and Context Assembly

*Retrieve broadly, then spend compute on precision*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 12.*

## Learning outcomes

- Separate candidate retrieval from reranking.
- Compare ranking quality before and after reranking.
- Assemble context with traceable source metadata.

## Before you begin

Chapters 8–11; a query set with relevance labels.

## Why this matters

Initial retrieval is designed to find candidates efficiently. A reranker can spend more work comparing a smaller candidate set, after which context assembly must keep relevant evidence within the model’s input budget.

## Visual model

> **Source figure description retained:** Query → broad retriever → candidate pool → cross-encoder reranker → context selection/order → model input.

**Authored instructional mechanism map — retrieve, rerank, assemble.** The candidate count `50` follows the chapter's pseudocode; it is a design example, not a measured optimum.

| Stage | Input → output | Check before proceeding |
|---|---|---|
| Retrieve broadly | Query → up to 50 candidate passages | Did the pool contain the labeled supporting passage? |
| Rerank | Query plus each candidate → revised relevance order | Inspect quality gain and added latency on the same labeled queries |
| Select bounded context | Ranked pool → passages that fit the chosen budget | Preserve source ID and location; limit duplicates |
| Order and assemble | Selected passages → model context | Confirm that exclusions/metadata were not lost during assembly |
| Generate and validate | Context → response candidate | Check response contract and evidence separately from retrieval rank |

**Missing-evidence branch:** if retrieval omits the necessary passage, reranking cannot create it. Change retrieval or abstain; do not treat a confident reranker score as evidence. The browser uses a transparent coverage/order heuristic, while a cross-encoder in this map is a separate real-system option.

## Try the simulation

Open lesson `ai-12`; its active visual engine is `retrieval-microscope`. Set **Maximum chunk size** to one sentence, inspect the lexical/vector rank disagreement, and predict whether **Hybrid + coverage/order rerank** will change the fused order. Switch between **Reciprocal-rank fusion** and the reranker: scores change, but this fixed fixture still preserves the fused order. The project task below asks you to build a separate case where adjacency changes it. Feature hashing is non-semantic, the reranker is a transparent heuristic rather than a cross-encoder, and top-k limits displayed passages rather than a token or latency budget.

## Concepts to retain

### Candidate retrieval

Efficiently finds a pool that may contain relevant evidence.

### Cross-encoder

Scores a query and candidate together for more detailed relevance.

### Context assembly

Selects and orders evidence under a context budget.

## How it works

1. Retrieve a candidate pool.
2. Score query-candidate pairs with a reranker.
3. Select a bounded number of passages.
4. Retain source identifiers and locations.
5. Compare end-to-end retrieval quality and cost.

## Worked example

A dense retriever returns several plausible passages. A cross-encoder scores each passage with the query, allowing the application to reorder the pool before assembling context. If the needed passage never entered the pool, reranking cannot recover it.

## Implementation sketch (pseudocode)

```ts
const candidates = retriever.search(query, { k: 50 });
const ranked = reranker.rank(query, candidates);
const context = assemble(ranked.slice(0, maxPassages), { tokenBudget: budget });
```

This is an illustrative pseudocode sketch, not runnable code. Placeholder APIs or model operations are conceptual; the course project below can use small deterministic local data and no paid provider.

## What to measure

- Recall in candidate pool before reranking.
- MRR or nDCG after reranking.
- Reranker latency and context token count.

## Failure modes to reason about

- Expecting reranking to recover candidates retrieval missed.
- Reranking too many passages and exceeding latency budget.
- Dropping citation metadata during assembly.
- Filling context with near-duplicate passages.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- In the lesson simulation, compare the fused order with the reranked order for the fixed query and note which passages change score.
- On paper, write five candidate passages with query-term coverage and adjacency scores, and reorder them by a combined score. Check that the order changes only when adjacency or coverage differs.
- Set a small context-count limit (for example 2) and list which citation IDs survive selection.
- The simulation reranker is a transparent heuristic; there is no learned cross-encoder or token-budget API.

## Course project — milestone 2: Retrieval

**Task:** In your own TypeScript project, add a small reranking step after candidate retrieval. Use a transparent heuristic such as query-term coverage plus a bonus for adjacent chunks from the same source, and keep it separate from the retriever so the candidate pool and the reranked list can be inspected on their own. Then add a context-selection step that keeps only a fixed number of passages and carries each passage’s source ID and location through. Write a Vitest or `node --test` test with a hand-built candidate list where the heuristic must change the order, asserting the exact reranked order. Add a second test asserting that every selected passage still has its source ID and location, and a third asserting that a passage missing from the candidate pool never appears after reranking.

**Acceptance check:** Your tests show that reranking only reorders the pool it is given, and that source metadata survives selection. You describe the heuristic as a heuristic, not as a learned cross-encoder, and you do not claim it fits a model token budget unless you count tokens with the model’s own tokenizer.

Use small deterministic local data in your tests. No API key is required, and this check does not claim model-generated quality.

### Recall without notes

- What is reranking responsible for?
- What limitation remains if the candidate pool has low recall?
- Why preserve locations during context assembly?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Sentence Transformers — Cross-Encoders](https://www.sbert.net/examples/cross_encoder/applications/README.html)
- [Eugene Yan — LLM patterns](https://eugeneyan.com/writing/llm-patterns/)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
