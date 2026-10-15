# Chapter 13 — Production RAG Architecture

*Treat retrieval as a product subsystem*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 13.*

## Learning outcomes

- Map ingestion and query planes.
- Preserve source identity and authorization through retrieval.
- Identify freshness and partial-ingestion failure signals.

## Before you begin

Chapters 8–12; basic service and data-pipeline concepts.

## Why this matters

A production RAG system must own ingestion, access control, freshness, retrieval quality, citations, and failure recovery. A vector database and prompt describe only part of the system.

## Visual model

> **Source figure description retained:** Ingestion plane: parse → chunk → embed → index with versions. Query plane: authorize → retrieve → rerank → assemble → generate cited response; monitoring and reindexing span both.

**Authored instructional mechanism map — ingestion and query planes.** This design map expands the source description without claiming the course supplies a production identity service or index.

| Plane/stage | Information retained | Failure branch |
|---|---|---|
| Ingestion: parse/chunk | Stable document ID, source location, source version | Record parse failure or partial ingestion instead of publishing an incomplete index silently |
| Ingestion: embed/index | Chunk ID, compatible encoder version, access metadata | Reindex when content or encoder changes; track incomplete backfills |
| Query: authorize | Allowed source IDs derived from trusted request identity | Reject access before evidence enters ranking/context |
| Query: retrieve/rerank | Only eligible candidates with source/version metadata | Missing evidence → explicit insufficient-evidence result |
| Query: assemble/answer | Selected source IDs and cited locations | Validate citations against the same allowed set before response |
| Across both planes | Index/source freshness and stage-completion signals | Stale source/index mismatch requires refresh or a stated degraded mode |

**Toy contamination path:** current top-two context has recall/precision `1.00`; admitting one matching stale or restricted passage displaces one relevant passage, producing `0.50`; admitting both produces `0.00`. Those are the browser's fixed fixture labels, not measured production impact. A policy changed today while its index updates tomorrow illustrates why valid source IDs alone do not establish freshness.

## Try the simulation

Open lesson `ai-13`; its active visual engine is `retrieval-microscope`. Start with the default one-sentence maximum and top two. Predict what happens if the stale or restricted source is admitted, then toggle each one independently. Both unusable sources deliberately share the query terms, so each enters the top two and displaces a current relevant chunk: toy recall and precision fall from `1.00` to `0.50`. Including both lowers them to `0.00`. The visual lists eligible and excluded chunks, and labels each result's source status. Increase the maximum chunk size: the toy chunker keeps source-status boundaries separate, so excluded material never merges into a current chunk. These fixed metadata labels illustrate filtering before ranking; they do not implement real identity checks, source versioning, or a production index.

## Concepts to retain

### Ingestion plane

Parse, normalize, chunk, embed, and index documents.

### Query plane

Authorize the caller, rewrite the request, retrieve, rerank, assemble context, and generate the cited response.

### Governance

Permissions and freshness must survive every retrieval step.

## How it works

1. Version documents and embeddings.
2. Keep source IDs and page locations with each chunk.
3. Derive the allowed source IDs from the request’s trusted identity and filter before retrieval; validate returned citations against that same set. Preserve stable source IDs through chunking. A small learner project can accept an explicit allowed-ID set and keep document IDs plus exact character offsets, but that is a boundary demonstration, not a production identity service or page-level provenance.
4. Evaluate retrieval independently of generation.
5. Support reindex/backfill and stale-index detection.

## Worked example

A policy document changes today but the vector index updates tomorrow. If retrieval serves the old chunk, a fluent answer can cite obsolete policy. Freshness must be treated as a correctness concern, not only an indexing detail.

## Implementation sketch (pseudocode)

```ts
const documentVersion = source.version;
const chunks = parseAndChunk(source);
index.upsert(chunks, { metadata: { version: documentVersion } });
// Query path applies authorization before context assembly.
```

This is an illustrative pseudocode sketch, not runnable code. Placeholder APIs or model operations are conceptual; the course project below can use small deterministic local data and no paid provider.

## What to measure

- Ingestion completion and failure counts by stage.
- Index freshness compared with source version.
- Retrieval quality and citation support.
- Authorization-filtered result counts.

## Failure modes to reason about

- Permission leakage through shared indexes.
- Stale embeddings after source edits.
- Silent partial ingestion.
- Citations that do not support the associated claims.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Write three tiny documents on paper (for example `public-1`, `public-2`, `private-1`) and treat one of them as untrusted document text.
- Pick an allowed-ID set of two and mark which candidates survive filtering before retrieval.
- Invent a cited answer that names `private-1` and mark where citation validation against the same allowed set must reject it.
- Record the limit: IDs in a toy set demonstrate a boundary, not production authentication or page-level provenance.

## Course project — milestone 2: Retrieval

**Task:** In your own TypeScript project, make the retrieval path take an explicit set of allowed document IDs and filter candidates by that set before ranking. Keep a stable document ID plus start and end character offsets on every chunk. Then validate the final citations against the same allowed set, so an answer that cites a document outside the set is rejected. Write Vitest or `node --test` tests with a few small in-memory documents: one asserting that a scoped query returns only chunks from allowed documents (`toEqual` on the returned document IDs), and one asserting that a forged citation to a disallowed ID makes your validator fail (`toThrow` or an equivalent rejected result). Treat the document text as untrusted data in these tests, for example by including a document that contains an instruction-like sentence and asserting it is returned only as quoted evidence.

**Acceptance check:** Your data-flow note shows allowed-ID filtering before retrieval, citation checking against the same set afterward, and what character offsets do and do not give you. Distinguish an explicit allowed-ID argument from production identity, and character offsets from page-level provenance. Passing these tests does not show that a citation semantically supports its claim.

Use small deterministic local data in your tests. No API key is required, and this check does not claim model-generated quality.

### Recall without notes

- Which responsibilities belong to ingestion versus query time?
- Where should authorization be enforced?
- How can the system detect stale or partial indexing?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Anthropic — Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- [Eugene Yan — LLM patterns](https://eugeneyan.com/writing/llm-patterns/)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
