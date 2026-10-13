# Chapter 10 — Chunking and Contextual Retrieval

*Preserve meaning when documents are broken apart*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 10.*

## Learning outcomes

- Compare fixed-size and structure-aware boundaries on examples.
- Trace each chunk back to its source location.
- Evaluate how chunking changes retrieval results.

## Before you begin

Chapters 8–9; familiarity with documents and retrieval.

## Why this matters

Retrieval systems index pieces of documents, but naive boundaries can separate a fact from the context needed to interpret it. Chunking therefore affects recall, precision, and citation quality.

## Visual model

The lesson illustration shows a source split into passages while section context and source locations stay attached. Use the retrieval microscope to inspect its fixed fixture; the artwork is not a ranking trace.

## Try the simulation

Open lesson `ai-10` and compare **Maximum chunk size** one sentence with two sentences. Its four-sentence toy scenario covers a storage limit, the heading that scopes that limit, a sentence-only split, and source offsets. The query is “chunk heading context source boundary.” Before each change, predict which neighboring sentences will share a passage and how many passages can appear in top-k. Inspect the ranked text and toy recall; do not treat a change in this fixture as evidence of general retrieval improvement.

The visual groups fixed sentences by count; it does not preserve document headings, apply overlap, or generate contextual descriptions. Use the project chunker below to inspect source IDs, then propose metadata you would add for a real document collection.

## Concepts to retain

### Chunk boundary

The text span stored and retrieved as one unit.

### Overlap

Shared text between adjacent chunks to retain boundary context.

### Contextual retrieval

Attach document context to a chunk so a local passage is easier to interpret.

## How it works

1. Parse document structure before splitting where available.
2. Choose a chunking rule appropriate to the content.
3. Preserve document, page, and section identifiers.
4. Compare overlap or contextual descriptions against a baseline.
5. Evaluate retrieval and citations on labeled queries.

## Worked example

A paragraph containing “this value is valid for 30 days” may be ambiguous without the preceding section that defines “this value.” A structure-aware chunk or contextual description can preserve the relationship; test whether it helps the target queries.

## Implementation sketch (pseudocode)

```python
chunk = {
    "text": section_text,
    "source_id": document_id,
    "page": page_number,
    "section": heading,
}
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Recall and precision on labeled queries.
- Citation/source-location accuracy.
- Chunk count and indexed token volume.

## Failure modes to reason about

- Splitting tables or procedures without preserving structure.
- Making chunks so small that context disappears.
- Making chunks so large that irrelevant text dominates.
- Losing source identifiers during chunking.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Run the project chunker on fixture `ops-02` and inspect its two sentence-based passages.
- Change `sentences_per_chunk` in a local experiment and compare boundaries and word counts.
- Keep each passage’s `document_id` and use `span_id`, `start_char`, and `end_char` to map a chunk back to its exact fixture text.
- Do not call a contextualization model; use a short hand-written context note only if you clearly label it as fixture data.

## Course project — milestone 2: Retrieval

**Task:** Inspect sentence chunking and verify that every passage carries stable character offsets into its source document. The offsets are fixture character positions, not PDF page coordinates or token counts.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m document_intelligence --trace "How can the previous index roll back?"
python -m unittest discover -s tests -p "test_course_project.py" -k "fixture_question_returns_only_cited_allowed_evidence" -v
```

**Expected observation:** Trace rows identify source spans such as `ops-02:<start>-<end>`. The answer test confirms that slicing the original text by each returned offset reproduces the cited span.

**Acceptance check:** State the two-sentence chunk boundary rule and distinguish character offsets from page locations and provider token counts.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- What information can a chunk boundary discard?
- Why preserve page and section metadata?
- How would you test whether a chunking change helped?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Anthropic — Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)
- [LangChain — Text splitters concepts](https://docs.langchain.com/oss/python/integrations/splitters)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
