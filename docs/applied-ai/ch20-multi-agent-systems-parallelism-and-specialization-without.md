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
| Retrieval/safety worker | Both retrieval cases and safety | Preserve a known paraphrase miss rather than hide it |
| Evaluation worker | Evaluation plus an intentionally overlapping safety case | Mark overlapping evidence and retain its provenance |
| Synthesizer | Validated worker records | Deduplicate source IDs, retain worker/source attribution, identify disagreements |
| Comparator | Same single-worker and partitioned workload | Measure coverage, unique sources, repeated findings, wall time, and cost where available |

**Two separate experiments:** running identical deterministic queries at 1, 3 and 5 concurrent workers should return the same covered-source count each time. That is a concurrency baseline, not a quality result. The specialist-record exercise tests partitioning and attribution; more records alone do not imply better quality, and intentional overlap may provide corroboration. Shared mutable writes need ownership or coordination beyond either exercise.

## Try the simulation

Open lesson `ai-20` and follow worker scope assignment through result collection. Select **Deliver one worker result twice** and inspect the merge outcome. Explain why deduplicating one result does not prove that workers have disjoint scopes or safe shared-state writes. Test the separate concurrency baseline in the practice lab and project task below; it runs identical queries concurrently and does not model specialized agents.

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

```ts
const tasks = [
  { scope: "market evidence", sources: [], findings: [], limitations: [] },
  { scope: "technical evidence", sources: [], findings: [], limitations: [] },
  { scope: "regulatory evidence", sources: [], findings: [], limitations: [] },
];
// Pseudocode: execute bounded workers, validate each record against this schema,
// then synthesize while retaining source IDs and measuring duplicated findings.
```

This is pseudocode; worker execution and synthesis are application-defined and are not supplied by the course. The example shows the output contract to validate, not a runnable multi-agent framework.

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

- Write six hand-made evaluation cases (reliability, workflow, two retrieval, evaluation, safety), including one retrieval paraphrase case you expect to be missed, and define one worker-result schema: `scope`, `sources`, `findings`, and `limitations`.
- Create a single-worker baseline that handles all six cases, then split them across three hypothetical specialists: reliability + workflow, retrieval + safety, and evaluation. Give the retrieval specialist both retrieval cases; have the evaluation specialist also inspect the safety case to create a deliberate overlap. Label these records as a coordination exercise, not LLM results.
- Synthesize the records and calculate expected-source coverage, unique source IDs, repeated source returns, and whether each finding retains its worker/source attribution. Explain why repeated evidence may be useful corroboration rather than wasted work.
- Treat a concurrency run of identical deterministic calls as a separate baseline; it measures identical function calls, not specialist quality or model cost.

## Course project — milestone 3: Workflow

**Task:** In your own TypeScript project, add a small bounded fan-out for one task that has independent parts (for example answering several independent sub-questions, or checking several documents). Define a worker-result type with `scope`, `sources`, `findings` and `limitations`, run the parts concurrently with a small fixed limit (batches of `Promise.all` are enough), and write a synthesizer that merges the records, deduplicates source IDs, and keeps which worker produced each finding. Write a Vitest or `node --test` test with scripted worker functions that asserts a duplicated source ID appears once in the merged sources while both workers remain credited, and a test that a worker record missing a required field is rejected before synthesis. Add a test that the same deterministic workload run with concurrency 1, 3 and 5 yields identical merged output (`deepStrictEqual`). Do not measure timing as a benchmark.

**Acceptance check:** Your record shows identical merged coverage at each concurrency level, keeps any known miss visible, and states that this baseline does not measure specialization, duplicate work, attribution quality or coordination quality. Scripted workers are not multi-agent model behavior. Keep any hypothetical specialist comparison separate and label its assumptions.

Use small deterministic local data and scripted workers in your tests. No API key is required, and this check does not claim model-generated quality.

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
