# Chapter 18 — Context Engineering

*Give the model the right information, not all information*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 18.*

## Learning outcomes

- Budget context by category.
- Use progressive disclosure and code-side filtering.
- Compact old trajectory without losing state needed to continue.

## Before you begin

Chapters 15–17; token counting and tool results.

## Why this matters

Context is a finite working set. Loading every tool schema, old message, and raw API result can increase cost while making important evidence harder to use.

## Visual model

> **Source figure description retained:** Context budget divided into task, instructions, relevant state, tools, retrieved evidence, and reserved space for new observations and output.

**Authored instructional mechanism map — context assembly with headroom.** The schema sizes below are the chapter's assumed values, not provider token measurements.

| Assembly stage | What enters the working set | What stays outside it |
|---|---|---|
| Task + policy | Current objective and governing instructions | Irrelevant historical requests |
| Durable state | Needed IDs, completed steps, pending action | Full old trajectory when it is no longer needed |
| Discover relevant tools | 10 schemas × assumed 250 tokens = about 2,500 tokens | Loading 400 such schemas would use about 100,000 tokens |
| Filter evidence/tool results | Relevant passages or a code-produced summary with source IDs | Raw large tables and unrelated document bodies |
| Reserve headroom | Allowance for next observations and final output | Do not fill the window to its limit before tools return |

**Budget gate:** task + policy + selected state + tools + evidence + reserved allowance must fit the model's actual context limit. If it does not, retrieve less or compact deliberately before calling the model. Preserve IDs and pending-action details needed to resume; the starter's lexical counts are a proxy, not model token counts.

## Try the simulation

Open lesson `ai-18` and advance the **agent-state-machine** through evidence retrieval and ranking. Predict what happens when you select **Replay the same evidence page**, then inspect the context assembly boundary. The visual shows the selection pipeline but does not assemble prompts, count model tokens, or compact context; use the lexical word-count proxy in the practice lab for a separate context experiment.

## Concepts to retain

### Progressive disclosure

Retrieve tools or data when they become relevant.

### Compaction

Reduce old trajectory while preserving machine-relevant state.

### Context budget

Reserve space for tool responses and final synthesis.

## How it works

1. Budget context by category.
2. Retrieve rather than preload large corpora or tool catalogs.
3. Filter large tool results outside the model.
4. Compact stale trajectory.
5. Reserve headroom for unexpected work.

## Worked example

At 250 tokens per tool schema, loading 400 tools costs about 100,000 tokens before task data. Discovering 10 relevant tools would use about 2,500 tokens at the same assumed size. This is an illustrative arithmetic example, not a universal schema size.

## Implementation sketch (pseudocode)

```python
available_tools = discover_tools(task, catalog)
rows = database.query(filters)
summary = summarize_rows_in_code(rows)
context = assemble(task, state, available_tools, summary, reserve=budget)
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Input tokens by context category.
- Success, latency, and cost before and after disclosure/filtering. The latency here is the retrieval and assembly latency in the prompt path — the time to find and build the context, before generation.
- Resume success after compaction.

## Failure modes to reason about

- Treating the context window as free storage.
- Summaries that lose IDs or state needed to continue.
- Returning raw 50,000-row API results to the model.
- Leaving no reserve for tool responses or synthesis.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Use the project fixture’s local text to compare character count and lexical-term count.
- Make a small list of hypothetical tool descriptions and count their words with the existing tokenizer heuristic.
- Choose a subset by task relevance and estimate the relative context reduction using those word counts only.
- Label this as a rough lexical proxy, not a model tokenizer or implemented context compaction.

## Course project — milestone 3: Workflow

**Task:** Inspect the scope-filter path in `pipeline.py` and the fixture source IDs. The project does not have a token-window manager, tool discovery, or context-compaction implementation.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "fixture_question_returns_only_cited_allowed_evidence" -v
python -m document_intelligence "Can a retrieved document change tool permissions?"
```

**Expected observation:** The test passes; the CLI cites allowed fixture sources (`ops-03` and `ops-02`). Request IDs vary.

**Acceptance check:** Your context-budget note separates durable source IDs from transient prompt context and does not claim this local extractive pipeline performs model-context compaction.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- What context should be loaded progressively?
- Which information must survive compaction?
- Why should large data filtering happen outside the model?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic — Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
