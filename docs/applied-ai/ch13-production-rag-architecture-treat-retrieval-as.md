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

**Authored instructional mechanism map — ingestion and query planes.** This design map expands the source description without claiming the fixture has a production identity service or index.

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
3. Derive the allowed source IDs from the request’s trusted identity and filter before retrieval; validate returned citations against that same set. Preserve stable source IDs through chunking. The fixture starter accepts an explicit allowed-ID set and retains document IDs plus exact character offsets. It has no PDF page coordinates or production identity service.
4. Evaluate retrieval independently of generation.
5. Support reindex/backfill and stale-index detection.

## Worked example

A policy document changes today but the vector index updates tomorrow. If retrieval serves the old chunk, a fluent answer can cite obsolete policy. Freshness must be treated as a correctness concern, not only an indexing detail.

## Implementation sketch (pseudocode)

```python
document_version = source.version
chunks = parse_and_chunk(source)
index.upsert(chunks, metadata={"version": document_version})
# Query path applies authorization before context assembly.
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

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

- Use the checked-in `ops-03` evidence-policy record as untrusted document text.
- Trace `allowed_document_ids` filtering and the final citation validation in the starter.
- Run the scoped-citation and forged-citation tests in the project section.
- Record the limit: fixture IDs demonstrate a boundary, not production authentication or page-level provenance.

## Course project — milestone 2: Retrieval

**Task:** Trace how `allowed_document_ids` is applied before search in `pipeline.py`, then how `Answer.validate` in `document_intelligence/models.py` validates the citation set (`safety.py` builds the spans it checks). Inspect the cited `span_id`, `start_char`, and `end_char` values. These locate text within the JSON fixture document; they do not provide PDF page coordinates or authenticate a user.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "fixture_question_returns_only_cited_allowed_evidence" -v
python -m unittest discover -s tests -p "test_course_project.py" -k "answer_contract_rejects_a_forged_source" -v
```

**Expected observation:** Both scope tests pass: a scoped answer cites only `ops-03`, and a forged `private-doc` source is rejected.

**Acceptance check:** Your data-flow note shows allowed-ID filtering before retrieval, document-ID citation checking afterward, and the scope of fixture character offsets. Distinguish the explicit allowed-ID argument from production identity and character offsets from page-level provenance.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

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
