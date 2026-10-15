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

The visual groups fixed sentences by count; it does not preserve document headings, apply overlap, or generate contextual descriptions. Use your own chunker from the course project below to inspect source IDs, then propose metadata you would add for a real document collection.

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

```ts
const chunk = {
  text: sectionText,
  sourceId: documentId,
  page: pageNumber,
  section: heading,
};
```

This is an illustrative pseudocode sketch, not a runnable command. Placeholder APIs or model operations are conceptual; the project path below uses only a small hand-written document.

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

- Write a short document of four or five sentences (the lesson's four-sentence scenario works) and split it into passages of two sentences each.
- Change the sentences-per-passage setting in a local experiment and compare boundaries and word counts.
- Give each passage a `sourceId`, `startChar`, and `endChar`, and use them to map a chunk back to its exact text in the source string.
- Do not call a contextualization model; use a short hand-written context note only if you clearly label it as sample data.

## Course project — milestone 2: Retrieval

**Task:** In your own TypeScript project, write a chunker for your knowledge base that splits each document by a stated rule (for example, two sentences per passage) and returns passages with `sourceId`, `startChar`, `endChar`, and the section heading when your documents have one. Write a Vitest or `node --test` test that runs the chunker on a short sample document and asserts that `source.slice(startChar, endChar)` equals each passage's text exactly. Add a second test that asserts every passage keeps its `sourceId`, and a third that changes the sentences-per-passage setting and asserts the passage count changes in the way you predicted. Make your answer citations use the `sourceId` with the offsets, so a citation can be checked against the original text.

**Acceptance check:** State your chunk boundary rule and distinguish character offsets in your own text from page locations and provider token counts. The offset test shows citations point at real source text. It does not show that the chunking helps retrieval, which needs a labeled query set and a baseline comparison.

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
