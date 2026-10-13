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

**Resume path:** load explicit state → verify referenced artifact/version → select needed memory → assemble the smallest context → choose pending work. A note saying “worked on auth” does not identify the commit, failing tests, or feature status. The local JSON checkpoint persists completed stage results; it neither coordinates concurrent writers nor atomically commits an external effect.

## Try the simulation

Open lesson `ai-19`, advance to **Save checkpoint**, then predict what a repeated checkpoint write should do. Select **Replay the checkpoint write** and inspect the outcome. The interrupt control only pauses this mounted view; it does not simulate durable storage or conversational memory. The JSON file and `CheckpointStore` exercise below demonstrate the difference between a displayed checkpoint and persisted state.

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

```python
run_state = {
    "objective": objective,
    "completed_steps": completed_steps,
    "pending_steps": pending_steps,
    "last_checkpoint": checkpoint_id,
    "artifacts": artifact_ids,
}
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

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
- Write it to a temporary file with Python’s standard library, reload it, and resume from the recorded stage.
- Change a conversational note without changing authoritative state and verify the resumed action still uses the checkpoint.
- Compare the result with the project’s single-process `CheckpointStore` test; its temporary-file replacement protects a completed file write but does not coordinate concurrent writers or make an external side effect atomic with the checkpoint.

## Course project — milestone 3: Workflow

**Task:** Use the checkpoint store as durable execution state, separate from conversational context. Run the replay test and inspect the generated temporary JSON state through the test’s assertions.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "checkpoint_replays_completed_stage_without_repeating_effect" -v
```

**Expected observation:** The test passes: the completed `write-1` result is stored in a JSON checkpoint and returned for a repeated stage ID. The test does not simulate an external write or a crash between that write and the checkpoint.

**Acceptance check:** You can identify which task state must survive restart and distinguish that from reusable memory; the current starter persists workflow checkpoints only.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

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
