# Chapter 14 — Retrieval Evaluation

*Diagnose whether the model ever received the right evidence*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 14.*

## Learning outcomes

- Create query-to-evidence relevance labels.
- Compute recall@k and ranking metrics.
- Compare retrieval changes by query/document slice.

## Before you begin

Chapters 8–13; ranked lists and basic set arithmetic.

## Why this matters

Generation quality is downstream of retrieval. If the correct evidence never enters context, prompt engineering cannot reliably recover the answer.

## Visual model

> **Source figure description retained:** Labeled query/evidence set → retriever → ranked chunks → retrieval metrics → slice-level failure review, before evaluating generated answers.

**Authored instructional mechanism map — three different retrieval questions.** These rows reproduce the chapter's worked arithmetic so the reader can follow each denominator.

| Question | Labeled or returned state | Calculation | Interpretation |
|---|---|---|---|
| Did we retrieve the evidence? | Two relevant chunks exist; one appears in the top five | Relevance recall@5 = `1 / 2 = 0.5` | Half of the labeled evidence reached the candidate set |
| How soon does useful evidence appear? | First relevant ranks are 2 and 1 for two queries (from the worked example below) | MRR = `(1/2 + 1/1) / 2 = 0.75` | Uses the first relevant rank only, not evidence coverage |
| Are better passages placed earlier? | Returned grades `[2, 0]`; ideal grades `[2, 1]` | DCG@2 = `3`; IDCG@2 ≈ `3.631`; nDCG@2 ≈ `0.826` | Uses the stated graded labels and rank discounts |

**Evaluation path:** frozen query/labels → retrieved ranked IDs → compute the appropriate metric → compare task/document slices → inspect missing or badly ordered evidence. No relevant labels means recall is undefined; evaluate such queries in a separate abstention slice. ANN recall against exact neighbors is a different metric.

## Try the simulation

Open lesson `ai-14`; its active visual engine is `retrieval-microscope`. Set chunk size to one sentence so its three relevant evidence labels stay separate. Before raising k, predict how recall@k and precision@k change when another labeled supporting sentence enters the selected results. Inspect the displayed ranks. The visual has one fixed query and binary relevance labels; compute MRR and graded nDCG in the separate paper exercise below.

## Concepts to retain

### Recall@k

How much of the relevant evidence appears in the top k.

### MRR

For each query, take the reciprocal of the first relevant rank, then average across queries. If first relevant ranks are 2 and 1, `MRR = (1/2 + 1)/2 = 0.75`.

### NDCG

For ranked relevance grades `relᵢ`, `DCG@k = Σᵢ₌₁ᵏ (2^relᵢ − 1) / log₂(i + 1)`. `nDCG@k` divides this by `IDCG@k`, the score for the ideal ordering, so the result is normalized against the best ranking for the same labels.

## How it works

1. Create query-evidence relevance labels.
2. Evaluate retrieval before involving the LLM.
3. Slice by query type and document class.
4. Compare exact versus approximate retrieval where both are implemented, and keep ANN-vs-exact recall distinct from relevance recall.
5. Track changes when chunking, index, or embedding model changes.

## Worked example

For a query with two labeled relevant chunks, if the top five contains one, **relevance recall@5** is `1/2 = 0.5`. This differs from ch09’s ANN recall, which compares approximate results with exact-search results. A generated answer may sound fluent, but this retriever supplied only half the labeled evidence.

For a separate two-query MRR set, query A's first relevant chunk is at rank 2 and query B's is at rank 1. Therefore `MRR = (1/2 + 1/1)/2 = 0.75`. MRR uses only the first relevant rank for each query; it does not measure how many relevant chunks were retrieved.

For graded relevance, suppose the first two returned passages have grades `[2, 0]` while the ideal order is `[2, 1]`. Then `DCG@2 = 3/log₂(2) + 0/log₂(3) = 3`; `IDCG@2 = 3 + 1/log₂(3) ≈ 3.631`, so `nDCG@2 ≈ 0.826`. Record the grade scale before comparing runs; changing labels invalidates the comparison.

## Implementation sketch (pseudocode)

```python
relevant = set(gold_chunk_ids[query_id])
returned = set(top_k_chunk_ids[query_id])
if not relevant:
    # Keep no-evidence queries in a separate abstention evaluation slice.
    raise ValueError("recall is undefined without a relevant evidence label")
recall_at_k = len(relevant & returned) / len(relevant)
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Recall@k, MRR, and NDCG on a fixed labeled set.
- Metrics by query type and document class.
- Worst-query examples and failure categories.

## Failure modes to reason about

- Evaluating only final answer quality.
- Using synthetic questions that are easier than user queries.
- Changing embedding model without rebuilding baselines.
- Ignoring low-frequency failure slices.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Use the six rows in `fixtures/evaluation.json` as the deterministic project baseline, including its labeled paraphrase failure.
- In the retrieval visual, compare recall and precision calculated from its three fixed relevant sentences; these are separate toy labels, not the project evaluation set.
- For query A, label chunks `a` and `b` relevant; put only `a` in its top five at rank 2. Calculate relevance recall@5 as `1/2`. For query B, put its first relevant chunk at rank 1. Calculate MRR over A and B as `(1/2 + 1)/2 = 0.75`.
- Reproduce the graded `nDCG@2` calculation above, then reverse the two returned passages and calculate how the score changes.
- Do not describe the fixture’s citation coverage as answer correctness or as a live retrieval benchmark.

## Course project — milestone 2: Retrieval

**Task:** Run the checked-in fixture evaluation, inspect its per-case ranked spans, and diagnose the labeled paraphrase failure. The starter fixture has stable case IDs but no published version field; record the file revision if comparing changes. Treat `citation_coverage` as a fixture retrieval metric, not answer correctness or a live benchmark. Calculate MRR separately from a small labeled ranking.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m document_intelligence --evaluate
python -m unittest discover -s tests -p "test_course_project.py" -k "evaluation_reports_coverage_by_module" -v
```

**Expected observation:** Six cases produce overall citation coverage `5/6`; the retrieval slice is `0.5`, and the report names the expected source missed by the paraphrase query. Every successful case exposes ranked source spans. The test passes. The separate labeled exercise still gives query A recall@5 = `1/2` and two-query MRR = `0.75`.

**Acceptance check:** Identify the known paraphrase failure, report its retrieval slice, and distinguish fixture citation coverage from answer correctness, the visual’s toy relevance metrics, hand-calculated MRR, and ANN recall.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- What does recall@k tell you before generation?
- How do MRR and NDCG differ conceptually?
- Why keep the labeled evaluation set stable across changes?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [BEIR benchmark paper](https://arxiv.org/abs/2104.08663)
- [Stanford IR book — Evaluation of ranked retrieval results](https://nlp.stanford.edu/IR-book/html/htmledition/evaluation-of-ranked-retrieval-results-1.html)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
