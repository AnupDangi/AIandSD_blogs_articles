# Chapter 09 — Vector Search: Exact, HNSW, and IVF

*Trade recall, memory, and latency deliberately*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 09.*

## Learning outcomes

- Establish exact nearest-neighbor results as a baseline.
- Compute recall@k relative to that baseline.
- Compare index search settings with memory and build costs.

## Before you begin

Chapter 8; nearest-neighbor search and basic index terminology.

## Why this matters

Nearest-neighbor retrieval at scale is an indexing problem. Approximate indexes can reduce search work by accepting a measurable difference from exact results.

## Visual model

> **Source figure description retained:** Exact scan compares all vectors; HNSW traverses a proximity graph; IVF partitions vectors and probes selected lists.

**Authored instructional mechanism map — three search paths.** The paths describe index mechanisms; the course and the browser visual contain no HNSW or IVF implementation.

| Search path | Work performed | Inspectable trade-off |
|---|---|---|
| Exact baseline | Query vector → compare against every eligible indexed vector → sort nearest results | Establish the reference top-k under the same metric and filters |
| HNSW | Query vector → navigate upper graph layers → explore nearby graph candidates | Search breadth trades query work for fidelity to the exact neighbors |
| IVF | Query vector → select nearby coarse partitions → scan selected lists | Probe count controls how much of the partitioned index is searched |
| Evaluation | Approximate returned IDs intersect exact returned IDs | Record overlap, latency, memory, and build cost on the same queries |

**Chapter arithmetic:** exact top 10 has ten IDs; an approximate top 10 contains nine of them → ANN recall@10 = `9/10 = 0.9`. This measures fidelity to exact search. A separate human-labeled evidence set is required for relevance recall. Apply the same eligibility policy to both reference and approximate paths; filters can change the result set and measured recall.

## Try the simulation

Open lesson `ai-09` and set **Chunk size** to one sentence. Predict what happens to the displayed relevance recall when **Retrieved passages** changes from top 1 to top 3, then inspect the ranked rows. This visual has no ANN index or exact-neighbor comparison; calculate ANN recall against a separate hand-written exact top-five list in the practice lab.

## Concepts to retain

### Exact search

Compare a query against every vector in the indexed set.

### HNSW

Navigate a multilayer proximity graph.

### IVF

Partition vector space into lists and probe a subset.

## How it works

1. Build an exact baseline for representative queries.
2. Measure recall@k against exact results.
3. Tune HNSW search breadth or IVF probe count.
4. Track memory and build cost.
5. Re-evaluate after applying metadata filters.

## Worked example

If the exact top 10 contains ten neighbors and an approximate index returns nine of those, **ANN recall@10 relative to exact search** is `9/10 = 0.9`. This is index fidelity, not relevance recall against human-labeled evidence; measure both separately. A faster setting can lower latency and also lower ANN recall; measure both.

## Implementation sketch (pseudocode)

```ts
const exactIds = exact.search(query, { k: 10 });
const approxIds = ann.search(query, { k: 10 });
const overlap = approxIds.filter((id) => exactIds.includes(id)).length;
const recallAtK = overlap / 10;
```

This is an illustrative pseudocode sketch, not a runnable command. Placeholder APIs or model operations are conceptual; the project path below uses only a small in-memory exact search.

## What to measure

- Recall@k relative to exact search.
- Latency at representative concurrency.
- Index memory, build duration, and filtered result count.

## Failure modes to reason about

- Adding approximate search before measuring an exact baseline.
- Using index defaults without evaluation.
- Applying filters after ANN and returning too few results.
- Ignoring reindex/build time during deployment.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Write an exact top-5 list and an approximate top-5 list for a small toy query.
- Calculate ANN recall as overlap divided by 5, relative to the exact list.
- Separately mark which returned items are relevant and calculate relevance recall against those labels.
- Do not install FAISS or claim your toy code contains HNSW or IVF indexes.

## Course project — milestone 2: Retrieval

**Task:** In your own TypeScript project, add an exact vector search that scores every eligible vector in your small knowledge base and returns the top-k IDs, breaking ties by ID so results are deterministic. Add two small pure functions: `annRecallAtK(exactIds, approxIds)` for overlap with the exact list, and `relevanceRecallAtK(returnedIds, relevantIds)` for overlap with hand-labeled evidence. Write Vitest or `node --test` tests with these assertions. First, exact search on a four or five vector toy set returns the expected ID order. Second, an approximate list that shares nine of ten IDs with the exact list gives `annRecallAtK` equal to 0.9. Third, the same returned list scored against a different hand-labeled evidence set gives a different number from `relevanceRecallAtK`, showing the two measures are separate. Also add a test that applies a metadata filter before ranking and checks that both lists use the same eligible set.

**Acceptance check:** You define ANN recall against an exact top-k baseline and keep it distinct from relevance recall against labeled evidence. Your notes say the exact search is the baseline you would compare any future HNSW or IVF index to; your project does not implement either, so it makes no latency or ANN recall claim.

### Recall without notes

- What does recall@k measure here?
- Why does exact search provide a useful baseline?
- What trade-off should an index setting report?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [FAISS — Getting started](https://github.com/facebookresearch/faiss/wiki/Getting-started)
- [FAISS — Guidelines to choose an index](https://github.com/facebookresearch/faiss/wiki/Guidelines-to-choose-an-index)
- [pgvector](https://github.com/pgvector/pgvector)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
