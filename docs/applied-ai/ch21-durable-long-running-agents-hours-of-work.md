# Chapter 21 — Durable long-running agents

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 21*

## Learning outcomes

Design a task ledger that survives a process or context reset, break work into verifiable units, and distinguish persisted truth from a model’s memory of prior work.

**Prerequisite:** Chapters 15–20, agent workflows, tools, context, memory, and multi-agent coordination.

## Figure walkthrough

A task ledger points to one bounded unit of work. The worker executes and verifies it, stores the artifact and completion state, then a later worker reloads that persisted state and continues.

### Authored mechanism map: the crash window

This instructional map supplements the source walkthrough. The effect ledger and workflow checkpoint are separate stores.

| Boundary | Persisted effect service | Workflow checkpoint | Replacement worker's decision |
|---|---|---|---|
| Before indexing | No artifact | Stage pending | Begin the bounded stage |
| Index commits, worker exits | Artifact exists | Stage still pending | Reconcile with the effect service using the same stage/input key |
| Naive retry | A second artifact is created | Stage becomes complete | The final checkpoint hides a duplicated effect |
| Idempotent retry | Existing artifact is returned | Stage becomes complete | Verify the artifact and record completion |
| Later replay | Artifact still matches input | Stage complete | Validate persisted evidence before skipping work |

A completed checkpoint with a missing artifact is inconsistent evidence. Stop and investigate it; do not silently count it as success. If the inputs change, assign a new stage or publication version rather than reusing the old key.

## Why a harness matters

A long task can outlive a context window, network connection, or worker process. One giant prompt cannot be the source of truth. Persist a **checkpoint** (recoverable boundary), a **progress ledger** (completed and remaining work), and enough artifacts for a new session to reconstruct state.

The loop is: initialize workspace and ledger; choose a bounded unit; execute and verify it; persist artifacts and status; then resume from persisted state after interruption. Mark a unit complete only after its evidence is recorded. A new session should inspect the repository and run a baseline test before continuing.

## Worked example

For a 20-feature coding task, store each feature’s stable ID, status, acceptance check, and artifact reference in a JSON ledger. A run selects one unfinished feature, implements it, executes its checks, and records the result. If the process stops, the next run reads the ledger and current workspace rather than trusting a summary generated earlier.

This follows the source’s description of long-running harnesses using feature lists, progress notes, version history, and self-verification. The invariant is simple: **completion status must be supported by a verifiable artifact or check.**

## Practice lab

1. Create a 20-feature JSON ledger with `todo`, `in_progress`, and `done` states.
2. Let a worker select one unfinished feature per run.
3. Require a test result or explicit acceptance artifact before `done`.
4. Terminate the process mid-task and resume in a new process.
5. Compare the ledger with the workspace and explain any mismatch.

**Deliverable:** the ledger, a successful resume trace, and one failure trace.

## Failure review

- Context loss without persisted progress leads to repeated or contradictory work.
- Marking the whole project complete after one successful feature hides unfinished work.
- A resumed session that skips a baseline check may build on broken state.
- A commit or checkpoint is useful evidence, but is not itself proof that acceptance criteria pass.

## Recall

- What persisted fact allows a new worker to resume safely?
- Which check prevents premature completion?
- What should happen if the ledger says `done` but the artifact is missing?

## Source

- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

## Try the simulation

Advance the **`agent-state-machine`** through **Search docs** and **Commit checkpoint**. Predict what happens when you select **Redeliver the completion event**. The display keeps its position while the component remains mounted; it does not persist a stage ID across a process restart. The crash drill below asks you to restart a replacement process in your own project and inspect persisted effects instead.

## Course project — milestone 3 — Workflow

**Task:** In your own TypeScript project, pick one step that has a side effect (for example writing a record, sending a request to a service, or appending to a file) and a checkpoint that is saved after it. Add a stage key that stays stable across restarts and an input fingerprint (a hash of the step's inputs) stored with the effect. Before the step acts, look up the stage key: if an effect with the same key and the same fingerprint already exists, reuse it; if the key exists with a different fingerprint, fail loudly.

**Crash drill to implement:** Write a Vitest or `node:test` test that starts a child process (for example with `child_process.fork`) running the step. Make the child exit with a nonzero code after the effect commits but before the checkpoint is written. Then run a replacement process on the same inputs. In an unsafe mode (no stage key lookup), assert that two effect records exist. In the idempotent mode, assert that exactly one effect record exists and that the second run reports it reused the effect. Add two more assertions: a checkpoint that points at a missing completed artifact is rejected, and the same stage key with changed inputs is rejected.

**Acceptance check:** Your test shows the absent checkpoint at the crash, the duplicate in unsafe mode, and the single effect in idempotent mode. Explain why replacing a checkpoint file atomically does not close the window between the effect and the checkpoint, and why the stable stage key is bound to an input fingerprint. A local store models an effect service on one host; this drill verifies process-crash recovery only, not arbitrary remote exactly-once effects, power-loss durability, or concurrent checkpoint writers. Apply the same reasoning to a service that offers an idempotency key or an operation-status lookup; otherwise escalate the uncertain effect for review.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
