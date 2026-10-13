# Chapter 11 — Hybrid Retrieval and Rank Fusion

*Combine lexical precision with semantic recall*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 11.*

## Learning outcomes

- Compare lexical and dense retrieval on the same queries.
- Combine rankings with a rank-fusion method.
- Measure gains and regressions by query type.

## Before you begin

Chapters 8–10; retrieval metrics and ranked result lists.

## Why this matters

Dense semantic retrieval can miss exact names, identifiers, and rare terms, while lexical retrieval can miss paraphrases. Combining candidate lists can cover different query shapes.

## Visual model

> **Source figure description retained:** Query routes to lexical and dense retrievers; candidate rankings are fused and deduplicated into a final ranked list.

**Authored instructional mechanism map — rank fusion without raw-score scaling.** These hypothetical ranks and `c = 60` reproduce the worked example.

| Candidate | Lexical rank contribution | Dense rank contribution | RRF total |
|---|---|---|---|
| A | Rank 1 → `1/61 ≈ 0.01639` | Rank 4 → `1/64 = 0.015625` | Approximately `0.03202` |
| B | Rank 2 → `1/62 ≈ 0.01613` | Rank 1 → `1/61 ≈ 0.01639` | Approximately `0.03252` |

**Flow:** same query → two ranked lists → group by stable chunk ID → sum reciprocal-rank contributions for each ID → sort fused totals → inspect relevance by query slice. Reciprocal-rank fusion scores each document `d` as `RRF(d) = Σ 1/(c + rank(d))` with a common constant such as `c = 60`; the "RRF total" column below is that sum. B precedes A in this example. A candidate absent from one list receives no contribution from that list; duplicate appearances across retrievers become one fused candidate, not repeated context passages. Rank fusion avoids directly adding incompatible raw scores but still needs evaluation. The browser/project vector path is feature hashing, not learned dense semantics.

## Try the simulation

Open lesson `ai-11` and set **Maximum chunk size** to one sentence. For the fixed query **“rare error code timeout retry search,”** inspect **Lexical overlap** and **Toy feature-hashed vector**. Predict which passages appear in each ranked list, then select **Reciprocal-rank fusion** and inspect how it combines their positions. The visual uses `c = 60` and shows fusion scores to five decimal places. The worked arithmetic below is a separate hand-worked example using two candidate lists from the same query; it is not the live fixture's expected ranking. Feature hashing is non-semantic and does not implement learned embeddings.

## Concepts to retain

### Lexical retrieval

Matches terms and their statistical importance.

### Dense retrieval

Finds candidates by vector similarity.

### Rank fusion

Combines ranked lists without assuming their raw scores share a scale.

## How it works

1. Create the same query/evidence labels for each retriever.
2. Retrieve candidates from lexical and dense systems.
3. Fuse rankings using a consistent rule.
4. Deduplicate by stable document/chunk ID.
5. Inspect results by query slice.

## Worked example

A product code may be found exactly by lexical search while a paraphrased question about its behavior is found by dense search. Reciprocal rank fusion combines ranks using `RRF(d) = Σ 1/(c + rank(d))`, with a common constant such as `c = 60`. Suppose candidate A ranks 1st in lexical and 4th in dense, while B ranks 2nd in lexical and 1st in dense: `A = 1/61 + 1/64 ≈ 0.03202`; `B = 1/62 + 1/61 ≈ 0.03252`, so B ranks slightly higher. Fusion can include both candidate sources; whether the final ranking is better depends on evaluation.

## Implementation sketch (pseudocode)

```python
lexical = bm25.search(query, k=20)
dense = vector_index.search(embed(query), k=20)
fused = reciprocal_rank_fusion([lexical, dense])
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Recall@k and MRR by query type.
- Overlap and unique candidates from each retriever.
- Latency and cost added by the second retrieval path.

## Failure modes to reason about

- Assuming one retriever works equally well for every query.
- Adding retrieval sources without evaluating unique contribution.
- Combining raw scores with incompatible scales.
- Failing to deduplicate overlapping candidates.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Use the worked rank lists for A and B to calculate reciprocal-rank fusion with `c=60`.
- Check the arithmetic by summing `1/(c+rank)` for each result list.
- Run the project’s hybrid-fusion test and inspect how its lexical and feature-hashed vector rankings are combined.
- The starter’s local feature hashing is deliberately non-semantic; the lesson’s worked ranks remain a separate arithmetic example.

## Course project — milestone 2: Retrieval

**Task:** Trace `hybrid_search` through `reciprocal_rank_fusion` in `retrieval.py`. Explain how the project combines lexical results with deterministic feature-hashed vector results, and why that vector path is not a substitute for learned embeddings.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m document_intelligence --trace "How can the previous index roll back?"
python -m unittest discover -s tests -p "test_course_project.py" -k "hybrid_fusion_and_reranking" -v
```

**Expected observation:** The trace prints lexical, toy-vector, hybrid, and reranked passages with ranks and scores; the hybrid score is the RRF sum for that passage, rounded to five decimals. `test_hybrid_fusion_and_reranking_preserve_passage_citations` passes. The trace displays candidate rankings rather than a final answer; run the CLI without `--trace` to inspect cited extractive evidence.

**Acceptance check:** You can calculate the chapter’s RRF example and identify the project’s local hybrid path, while stating that its hashed vectors are non-semantic and its fixture set is too small for quality claims.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- What query types favor lexical matches?
- Why can rank fusion avoid raw-score scaling problems?
- What makes a second retriever worth its cost?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Elasticsearch — BM25 similarity](https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity)
- [BEIR benchmark paper](https://arxiv.org/abs/2104.08663)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
