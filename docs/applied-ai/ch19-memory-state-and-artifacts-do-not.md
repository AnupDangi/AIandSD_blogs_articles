# Chapter 19 — Memory, State, and Artifacts

*Do not use chat history as your database*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 19.*

## Learning outcomes

- Define the different information a long-running task needs to persist.
- Resume from explicit state rather than a vague transcript summary.
- Track provenance and version for memory and artifacts.

## Before you begin

Chapters 15–18; JSON and persistent storage basics.

## Why this matters

Long-lived AI systems need a clear separation between transient context, durable execution state, reusable memory, and generated artifacts. Each has a different lifetime and authority, so the system should persist and rehydrate them deliberately.

## Visual model

> **Source figure description retained:** Transient context is assembled from durable RunState, selected memory, and versioned artifacts; authoritative business data remains in its source of truth.

**Authored instructional mechanism map — rehydrate a run from durable facts.** This table develops the chapter's distinction between context, state, memory, and artifacts.

| Information store | Example from a coding task | Authority/lifetime |
|---|---|---|
| Current context | Selected instructions, current observation, needed state | Temporary working set for one invocation |
| Durable RunState | Objective, completed/pending steps, checkpoint ID, artifact IDs | Determines where execution can safely resume |
| Reusable memory | Reviewed preference or learned convention with provenance/time | Selected input to future work; cannot override current authoritative data |
| Versioned artifacts | Commit identifier, test output, report/code version | Inspectable output referenced by stable identity |
| Business source of truth | Current account/order record owned by its service | Re-read when needed; chat summaries do not replace it |

**Resume path:** load explicit state → verify referenced artifact/version → select needed memory → assemble the smallest context → choose pending work. A note saying “worked on auth” does not identify the commit, failing tests, or feature status. A local JSON checkpoint file persists completed stage results; it neither coordinates concurrent writers nor atomically commits an external effect.

## Try the simulation

Open lesson `ai-19`, advance to **Save checkpoint**, then predict what a repeated checkpoint write should do. Select **Replay the checkpoint write** and inspect the outcome. The interrupt control only pauses this mounted view; it does not simulate durable storage or conversational memory. The JSON file exercise in the practice lab below demonstrates the difference between a displayed checkpoint and persisted state.

## Concepts to retain

### Context

What the current model invocation sees.

### Execution state

Objective, completed steps, IDs, and statuses needed to resume.

### Memory

Reusable facts or preferences across future runs.

### Artifact

A durable output such as code, report, or structured record.

## How it works

1. Persist execution state outside the context window.
2. Store only memories that improve future decisions.
3. Keep provenance and timestamps.
4. Treat generated artifacts as versioned data.
5. Rehydrate the smallest necessary context when resuming.

## Worked example

A coding agent should persist the commit identifier, failing tests, and feature status. A prose summary saying “worked on auth” is not enough to resume safely.

## Implementation sketch (pseudocode)

```ts
const runState = {
  objective,
  completedSteps,
  pendingSteps,
  lastCheckpoint: checkpointId,
  artifacts: artifactIds,
};
```

This is an illustrative pseudocode sketch, not runnable code. Placeholder APIs or model operations are conceptual; the course project below can use small deterministic local data and no paid provider.

## What to measure

- Successful resumes after process interruption.
- State fields missing or stale on resume.
- Artifact versions and provenance completeness.

## Failure modes to reason about

- Appending every conversation forever.
- Confusing a summary with authoritative state.
- Storing stale preferences without version or provenance.
- Allowing memory to override current source-of-truth data.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Define a JSON `RunState` record with objective, completed steps, pending steps, checkpoint ID, and artifact IDs.
- Write it to a temporary file with Node’s built-in file APIs, reload it, and resume from the recorded stage.
- Change a conversational note without changing authoritative state and verify the resumed action still uses the checkpoint.
- Note the limit: writing a temporary file and then renaming it over the checkpoint protects a completed file write, but a single-process checkpoint does not coordinate concurrent writers or make an external side effect atomic with the checkpoint.

## Course project — milestone 3: Workflow

**Task:** In your own TypeScript project, persist the workflow’s durable execution state (objective, completed stages with their results, pending stages, checkpoint ID, artifact IDs) as a JSON file, separate from any conversational context. Write it to a temporary file and rename it into place, and load it on startup so a new process can resume at the first pending stage. Keep reusable memory, if your application has any, in a separate record with provenance and a timestamp, and never let it override authoritative data. Write a Vitest or `node --test` test that uses a temporary directory, runs two stages, builds a fresh store instance from the same file to simulate a restart, and asserts that the completed stage is not run again (a call counter) and that the run resumes at the pending stage. Add a test that changing a free-text conversation note leaves the resumed stage unchanged.

**Acceptance check:** You can identify which task state must survive restart and distinguish that from reusable memory and from transient prompt context. Your test does not simulate an external write or a crash between that write and the checkpoint, so say plainly that atomicity with an external effect is not shown.

Use small deterministic local data and a temporary directory in your tests. No API key is required, and this check does not claim model-generated quality.

### Recall without notes

- What is the difference between context and execution state?
- Why does memory need provenance?
- What should a resume operation load?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Anthropic — Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [OpenAI Agents SDK guide](https://developers.openai.com/api/docs/guides/agents/sdk)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
