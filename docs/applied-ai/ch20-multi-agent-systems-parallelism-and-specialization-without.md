# Chapter 20 — Multi-Agent Systems

*Parallelism and specialization without coordination chaos*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 20.*

## Learning outcomes

- Partition a task into independent, bounded work packages.
- Compare specialized worker outputs with a single-worker baseline using coverage, overlap, and attribution.
- Synthesize worker findings with provenance and deduplicated citations.

## Before you begin

Chapters 15–19; experience designing bounded tasks or parallel jobs.

## Why this matters

Multiple agents can expand effective context and parallelize independent work, but they also introduce duplicated effort, communication cost, and shared-state hazards.

## Visual model

> **Source figure description retained:** Orchestrator assigns non-overlapping tasks to specialists; workers return bounded findings; synthesizer merges them while preserving source attribution.

**Authored instructional mechanism map — specialists with controlled synthesis.** This map uses the chapter's offline coordination exercise; the records are hypothetical, not model results.

| Worker/controller | Assigned scope | Required return / merge rule |
|---|---|---|
| Orchestrator | Frozen six-case workload and shared output contract | Define bounded scopes before starting workers |
| Reliability/workflow worker | Reliability and workflow cases | Return `scope`, stable `sources`, `findings`, `limitations` |
| Retrieval/safety worker | Both retrieval cases and safety | Preserve the known paraphrase miss rather than hide it |
| Evaluation worker | Evaluation plus intentional safety overlap (`ops-03`) | Mark overlapping evidence and retain its provenance |
| Synthesizer | Validated worker records | Deduplicate source IDs, retain worker/source attribution, identify disagreements |
| Comparator | Same single-worker and partitioned workload | Measure coverage, unique sources, repeated findings, wall time, and cost where available |

**Two separate experiments:** 1/3/5 threads running identical fixture queries all return `5/6` expected sources. That is a deterministic concurrency baseline. The specialist-record exercise tests partitioning and attribution; more records alone do not imply better quality, and intentional overlap may provide corroboration. Shared mutable writes need ownership or coordination beyond either exercise.

## Try the simulation

Open lesson `ai-20` and follow worker scope assignment through result collection. Select **Deliver one worker result twice** and inspect the merge outcome. Explain why deduplicating one result does not prove that workers have disjoint scopes or safe shared-state writes. Test the separate thread-count baseline below; it runs identical fixture queries concurrently and does not model specialized agents.

## Concepts to retain

### Orchestrator-worker

One controller delegates bounded tasks.

### Parallel specialists

Independent agents explore separate sources or hypotheses.

### Shared-state discipline

Avoid uncoordinated concurrent mutation.

## How it works

1. Use one agent until a limitation is demonstrated.
2. Partition work by independent context or skill.
3. Give workers narrow outputs and distinct scopes.
4. Aggregate through a controlled synthesizer.
5. Evaluate contribution, not the number of agents.

## Worked example

A research task can assign separate workers to market, technical, and regulatory evidence, then synthesize findings. Require each worker to return the same schema: `scope`, `sources` (stable URLs/IDs), `findings`, and `limitations`. Score the comparison on expected-evidence coverage, unique sources, duplicate findings, and wall time/cost; do not count more worker outputs as quality by itself. Five agents discussing the same paragraph can add cost without new information.

## Implementation sketch (pseudocode)

```python
tasks = [
    {"scope": "market evidence", "sources": [], "findings": [], "limitations": []},
    {"scope": "technical evidence", "sources": [], "findings": [], "limitations": []},
    {"scope": "regulatory evidence", "sources": [], "findings": [], "limitations": []},
]
# Pseudocode: execute bounded workers, validate each record against this schema,
# then synthesize while retaining source IDs and measuring duplicated findings.
```

This is pseudocode; worker execution and synthesis are not implemented by the local course starter. The example shows the output contract to validate, not a runnable multi-agent framework.

## What to measure

- Coverage and unique sources versus one worker.
- Duplicated work and synthesis time.
- Total wall time and cost.
- Evidence attribution completeness.

## Failure modes to reason about

- Agents recursively spawning agents without bounds.
- All workers retrieving the same sources.
- Concurrent edits to shared state with no ownership.
- Failing to attribute which worker/source supports each finding.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Use the six fixed evaluation cases, including the known retrieval paraphrase failure, and define one worker-result schema: `scope`, `sources`, `findings`, and `limitations`.
- Create a single-worker baseline that handles all six cases, then split them across three hypothetical specialists: reliability + workflow, retrieval + safety, and evaluation. Give the retrieval specialist both retrieval cases; have the evaluation specialist also inspect the safety case (`ops-03`) to create a deliberate overlap. Label these records as a coordination exercise, not LLM results.
- Synthesize the records and calculate expected-source coverage, unique source IDs, repeated source returns, and whether each finding retains its worker/source attribution. Explain why repeated evidence may be useful corroboration rather than wasted work.
- Run the project thread-pool command as a separate deterministic concurrency baseline; it measures identical function calls, not specialist quality or model cost.

## Course project — milestone 3: Workflow

**Task:** Compare one deterministic evaluation workload at different thread counts. This is a concurrency baseline for the same function calls, not a multi-agent system; it measures no model cost or specialist contribution.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python - <<'PY'
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from document_intelligence.pipeline import DocumentIntelligence, load_documents
cases = json.loads(Path("fixtures/evaluation.json").read_text())
app = DocumentIntelligence(load_documents())
for worker_count in (1, 3, 5):
    with ThreadPoolExecutor(max_workers=worker_count) as pool:
        results = list(pool.map(lambda case: app.answer(case["query"]), cases))
    covered = sum(case["expected_source"] in result.citations for case, result in zip(cases, results))
    print(f"{worker_count} threads: {covered}/{len(cases)} expected sources returned")
PY
```

**Expected observation:** The output is `1 threads: 5/6 expected sources returned`, `3 threads: 5/6 expected sources returned`, and `5 threads: 5/6 expected sources returned`. The paraphrase case remains a miss at every thread count. Timing is intentionally omitted because it is not a controlled benchmark.

**Acceptance check:** Your record reports the same six-case coverage at each thread count, includes the known miss, and states that this baseline does not measure specialization, duplicate work, attribution, or coordination quality. Keep the hypothetical specialist comparison separate and label its assumptions.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- What makes subtasks suitable for parallel work?
- How can you measure whether extra workers helped?
- Why must the synthesis retain attribution?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic — Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
