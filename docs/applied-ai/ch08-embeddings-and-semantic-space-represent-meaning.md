# Chapter 08 — Embeddings and Semantic Space

*Represent meaning as geometry*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 08.*

## Learning outcomes

- Compute cosine similarity for small vectors.
- Explain why metric and normalization choices matter.
- Create a retrieval fixture that exposes embedding limitations.

## Before you begin

Chapters 2–3; vectors, dot products, and basic TypeScript.

## Why this matters

Embeddings make semantic retrieval, clustering, and similarity possible by mapping inputs to vectors whose geometry can be useful for a task.

## Visual model

> **Source figure description retained:** Query and document text are encoded into vectors; nearest-neighbor search returns candidate documents with IDs and metadata.

**Authored instructional mechanism map — representation to relevance.** This numeric map uses the chapter's two-dimensional toy vectors; neither is a learned embedding.

| Stage | Inspectable operation | Meaning and limitation |
|---|---|---|
| Encode query/document | Produce compatible vectors with the same encoder configuration | Store stable document IDs and access/version metadata alongside vectors |
| Compare toy vectors | `a = [1, 1]`, `b = [2, 0]`; dot product = `2` | Dot product alone mixes direction and magnitude |
| Normalize cosine | `norm(a) = √2`, `norm(b) = 2`; `2 / (√2 × 2) ≈ 0.707` | Zero vectors require an explicit error/handling policy |
| Rank candidates | Sort using the chosen similarity or distance convention | A high score is a candidate-retrieval signal, not factual support |
| Evaluate relevance | Compare returned IDs with labeled evidence for the query | Check semantic and exact-identifier slices separately |

**Boundary:** similarity ranking → candidate IDs → relevance/evidence checks. A learned embedding may retrieve a paraphrase; the lesson's feature-hashed visual cannot demonstrate that semantic property.

## Try the simulation

Open lesson `ai-08`; its active visual engine is `retrieval-microscope`. The toy scenario asks for “similar meaning semantic vector” and shows four passages about embeddings, vector search, and exact nearest neighbors. Before changing a control, predict whether lexical overlap and the toy feature-hashed vector will rank the same passage first. Switch between those strategies and inspect their ranks; then change top-k and record the labeled recall. The feature-hashed vectors are not learned embeddings, so this fixture cannot demonstrate semantic paraphrase retrieval.

## Concepts to retain

### Vector representation

A fixed-length numeric representation of an input.

### Distance metric

Cosine, inner product, or Euclidean distance defines the comparison.

### Task fit

Embedding usefulness depends on domain, language, and retrieval objective.

## How it works

1. Embed documents and queries with compatible model settings.
2. Normalize when the chosen metric requires it.
3. Store vectors alongside stable document IDs and metadata.
4. Search nearest neighbors.
5. Evaluate retrieval on domain examples.

## Worked example

For `a=[1,1]` and `b=[2,0]`, cosine similarity is `2/(√2 × 2) ≈ 0.707`. Cosine compares direction rather than raw magnitude; it does not establish factual relevance by itself.

## Implementation sketch (pseudocode)

```ts
const denominator = norm(a) * norm(b);
if (denominator === 0) {
  throw new Error("cosine is undefined for a zero vector");
}
const cosine = dot(a, b) / denominator;
const queryVector = await embed(query);
const rows = index.search(queryVector, { k: 10 });
```

This is an illustrative pseudocode sketch, not a runnable command. Placeholder APIs or model operations are conceptual; the project path below uses a deterministic toy embedder, so no embedding API is needed.

## What to measure

- Nearest-neighbor relevance on labeled queries.
- Similarity distributions for relevant and irrelevant pairs.
- Recall for semantic queries and exact-identifier queries separately.

## Failure modes to reason about

- Assuming semantic similarity equals factual relevance.
- Mixing embedding models without reindexing.
- Ignoring exact identifiers and rare terms.
- Evaluating only with anecdotal queries.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Use the `retrieval-microscope` visual to change actual sentence grouping, compare lexical and feature-hashed vector ranks, and inspect toy recall/precision from the fixed relevance labels.
- Calculate cosine similarity by hand for `a=[1,1]` and `b=[2,0]`.
- Check what happens if either vector is `[0,0]`; reject the undefined cosine rather than silently assigning it a similarity score.
- Build a toy feature-hashed vector for each of the four passages (hash every word into one of a fixed number of buckets and count), rank them against the query by cosine, and explain why these vectors are deterministic but non-semantic.
- No embedding API or downloaded model is required.

## Course project — milestone 2: Retrieval

**Task:** In your own TypeScript project, add a `cosineSimilarity(a, b)` function that throws a clear error for a zero vector, and an `Embedder` interface with one method that turns text into a vector. Provide a deterministic toy implementation that hashes words into a fixed number of buckets, and label it non-semantic in code. Rank the passages in your small knowledge base by cosine against a query vector and return their IDs. Write Vitest or `node --test` tests with three assertions. First, the cosine of `[1, 1]` and `[2, 0]` is close to 0.707 (use a tolerance assertion such as `toBeCloseTo` or a manual absolute-difference check). Second, a zero vector makes the function throw. Third, for a query that shares words with one passage, that passage's ID ranks first. Add one more test that uses a paraphrase with no shared words and records, in a comment and an assertion, that the toy embedder cannot be expected to find it.

**Acceptance check:** You distinguish learned semantic embeddings from non-semantic feature hashing, and you can name one paraphrase query in your own knowledge base that the toy embedder misses. A high cosine score is a candidate-retrieval signal, not proof the passage supports an answer.

### Recall without notes

- What does cosine similarity compare?
- Why should query and corpus embeddings be compatible?
- Name a query type that can be poorly served by semantic similarity alone.

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [OpenAI — Embeddings guide](https://developers.openai.com/api/docs/guides/embeddings)
- [Sentence Transformers Quickstart](https://www.sbert.net/docs/quickstart.html)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
