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

Open lesson `ai-12`; its active visual engine is `retrieval-microscope`. Set **Maximum chunk size** to one sentence, inspect the lexical/vector rank disagreement, and predict whether **Hybrid + coverage/order rerank** will change the fused order. Switch between **Reciprocal-rank fusion** and the reranker: scores change, but this fixed fixture still preserves the fused order. The project test below supplies a separate case where adjacency changes it. Feature hashing is non-semantic, the reranker is a transparent heuristic rather than a cross-encoder, and top-k limits displayed passages rather than a token or latency budget.

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

```python
candidates = retriever.search(query, k=50)
ranked = reranker.rank(query, candidates)
context = assemble(ranked[:max_passages], token_budget=budget)
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

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

- Inspect the project’s hybrid candidates and run the deterministic heuristic reranker test.
- Compare query-term coverage and adjacency scores with the pre-rerank order.
- Set a small context-count limit and inspect which citation IDs survive selection.
- The project reranker is a transparent heuristic; there is no learned cross-encoder or token-budget API.

## Course project — milestone 2: Retrieval

**Task:** Inspect lexical, toy-vector, hybrid, and reranked results, then trace source-span validation in `Answer.validate` (`document_intelligence/models.py`); `safety.py` only builds the spans. The reranker uses query-term coverage and adjacency; it is not a learned cross-encoder or token-budgeted context assembler.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m document_intelligence --trace "How can the previous index roll back?"
python -m unittest discover -s tests -p "test_course_project.py" -k "reranker_changes_order" -v
```

**Expected observation:** The trace exposes candidate ranks and scores, and the reranker test passes. The CLI reports fixture character offsets, not model context-token counts.

**Acceptance check:** Distinguish candidate retrieval from heuristic reranking, explain why the candidate pool limits reranking, and do not describe the heuristic as a learned cross-encoder.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

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
