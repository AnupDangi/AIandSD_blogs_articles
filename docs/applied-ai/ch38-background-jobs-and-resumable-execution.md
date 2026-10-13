# Chapter 38 — Background jobs and resumable execution

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 38*

## Learning outcomes

After this lesson, you should be able to model a long-running task with explicit persisted states; distinguish job state from a request or worker process; and design resume, retry, cancellation, and stale-writer behavior around checkpoints.

**Prerequisite:** Chapter 21, durable long-running agents.

## Figure walkthrough

A durable job moves through `queued`, `running`, `waiting`, `succeeded`, `failed`, or `cancelled`. The browser connection and worker are temporary actors; the job record and its committed artifacts are the durable facts. A replacement worker should be able to read those facts and decide what remains safe to do.

### Authored mechanism map: two workers, one revision

This instructional map describes the local guarded-record experiment, not a recovered PDF figure.

| Ordered event | Worker snapshot | Stored revision/artifacts | Safe next decision |
|---|---|---|---|
| A and B read | Both see revision 4 | `4 / [extract]` | Each retains its expected revision |
| A commits indexing | A writes with expected revision 4 | `5 / [extract, index]` | Record state and artifact references together |
| B attempts its stale write | B still expects revision 4 | `5 / [extract, index]` | Reject the zero-row update; reload instead of overwriting |
| Replacement worker opens database | Reads authoritative revision 5 | `5 / [extract, index]` | Continue only unfinished work |
| Cancellation becomes terminal | Record becomes `cancelled` | Last committed artifacts remain | Reject further work on that terminal record |

Revision guarding protects the job record. A separate remote side effect still needs idempotency or reconciliation, as Chapter 21's crash window demonstrates.

## Separate the job from the connection

An interactive request can disconnect while document extraction or analysis continues. Give the work a stable job ID and store its state independently of the HTTP request. A useful record includes the current step, completed artifact IDs, attempt count, deadline or budget, cancellation request, and a monotonically increasing revision. Store enough input identity to tell whether a retry is the same task, while avoiding unnecessary copies of sensitive content.

Checkpointing alone does not prevent two workers from racing. Suppose both workers read revision 4. Worker A completes the step and writes revision 5. Worker B must not later replace revision 5 with its older view. A compare-and-swap update makes the transition conditional: write the new state only when the stored revision still equals the revision that was read. A failed guard means “reload and reconcile,” not “retry the stale write.” This protects the record, but it does not make an external email, payment, or tool call exactly-once. Side effects need their own idempotency key or reconciliation step.

Cancellation is also a request to transition, not an instantaneous kill switch. A worker checks for cancellation at defined safe points, records the result, and avoids starting another side effect. A lease or heartbeat can make an abandoned `running` job visible, but lease expiry must not silently authorize duplicate irreversible work.

## Worked example: two workers and one checkpoint

Both workers load `job-17` at revision 4 with `extract` complete and `index` pending. A finishes indexing and commits `index=complete, revision=5`. B then attempts to save its older state using `expected_revision=4`; the compare-and-swap rejects it because the stored revision is 5. After restart, a worker reads revision 5 and skips extraction and indexing. In this example, revision 5 remains authoritative; the rejected write is not counted as a successful job attempt.

The starter's `CheckpointStore` writes JSON through a temporary file and atomically replaces the checkpoint, and it replays a completed stage ID. It is a sequential teaching example: it has no revision guard, inter-process lock, database transaction, or durable queue. Atomic file replacement must not be mistaken for safe concurrent updates.

For the SQLite extension, the state transition can be one guarded statement inside a transaction:

```sql
UPDATE jobs
SET revision = revision + 1,
    completed_artifacts = :new_artifacts,
    state = :new_state
WHERE job_id = :job_id AND revision = :expected_revision;
```

Check the affected row count before committing. Exactly one updated row means the caller advanced the version it saw; zero means the job is missing or someone else advanced it, so reload and decide whether the requested stage is already complete. Store artifact references and the revision in the **same** row or transaction. Do not read revision 4 in one step and then issue an unconditional write in another: that recreates the lost update. SQLite transactions make the local record update atomic, but do not make a separate network call atomic with it.

The crash gap matters. If an external indexing API succeeds and the worker crashes before saving the checkpoint, a replacement worker sees the old state and may repeat indexing. A stable stage idempotency key or a read-after-timeout reconciliation query can resolve the uncertain effect. If the external API offers neither, mark the stage for operator review rather than assert exactly-once execution.

## Practice lab

From `projects/document-intelligence`, run the existing workflow test and inspect what it actually proves:

```sh
python -m unittest discover -s tests -p 'test_course_project.py' -k 'checkpoint_' -v
```

The observable result should be one passing test: completing `write-1` twice returns the first stored result, so the second completion does not replace it. This demonstrates same-process sequential replay only. It does not test a crash between an external side effect and checkpoint write, or two concurrent processes.

Then run `python -m unittest discover -s tests -p 'test_jobs.py' -v`. The synchronized JSON baseline interleaves the two stores in this order:

1. Worker A reads its snapshot.
2. Worker B reads its snapshot.
3. Worker B writes its stage.
4. Worker A writes from the earlier snapshot.

The final JSON loses B's completion. The SQLite test starts a separate worker process for B, then rejects A's retained revision-4 snapshot after B commits revision 5. B remains `running`, so the stale-write rejection exercises the revision guard rather than relying on a terminal-state guard. Do not infer concurrent-write safety from atomic file replacement.

**Deliverable:** the test, a state-transition diagram, and a short trace linking job ID, worker attempt, revision, and artifact IDs.

In your diagram, include `waiting_for_approval` as a durable pause. Show a cancellation request arriving during `running`: the worker finishes or reconciles any in-flight effect, checks cancellation at the next safe point, then commits `cancelled` or an explicit unresolved state. Record which states are terminal and whether a timed-out lease permits a new worker to act. The diagram should make a duplicate stage visibly impossible only where its idempotency control has been specified.

## Failure review

- A job left `running` forever needs a lease, timeout, or operator-visible recovery path.
- Retrying after an uncertain external side effect can duplicate it unless the operation is idempotent or reconciled.
- A stale checkpoint can erase newer progress when concurrent writes lack a revision guard.
- Retries and cancellation need explicit ordering and budget limits; a retry loop is not a recovery policy by itself.

## Recall

- Which state survives a worker restart, and which state exists only in process memory?
- How does a replacement worker distinguish a completed stage from an uncertain side effect?
- Given two writers that both read revision 4, what condition prevents the older writer from replacing revision 5?

## Sources

- [OpenAI background mode guide](https://developers.openai.com/api/docs/guides/background) — one provider's asynchronous request pattern. The durable job model here is application-owned and should not depend on this feature.
- [SQLite transactions](https://www.sqlite.org/lang_transaction.html) — write transaction behavior and commit outcomes for the local guarded-record exercise.
- [SQLite atomic commit](https://www.sqlite.org/atomiccommit.html) — guarantees and limits of an atomic database transaction; this does not cover external side effects.

## Try the simulation

Use the **`agent-state-machine`** visual engine. Follow the revision-4/5 path: workers A and B read revision 4, A commits revision 5, and B's stale write should be rejected. Select **Attempt stale revision-4 write** and explain why B must reload the current checkpoint before retrying. This is a deterministic state fixture, not a database transaction; the local test below verifies the actual compare-and-swap behavior.

## Course project — milestone 7 — Efficiency & recovery

**Efficiency — guarded checkpoint evidence.** Compare the sequential JSON store with `jobs.JobStore`, which saves revision, state, and artifact references together. Before running the demo, predict which write is accepted and what a fresh connection sees. Modify a copied fixture to give B a different artifact ID; confirm A's stale snapshot cannot replace it. Add one task-specific safe point for observing cancellation, and document how you reconcile an in-flight effect before marking the job terminal. The starter's terminal-state guard rejects further writes, but it does not implement a worker queue, cancellation polling, lease, heartbeat, or deadline policy.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m document_intelligence.jobs --demo
python -m unittest discover -s tests -p 'test_jobs.py' -v
python -m document_intelligence.durability --demo
```

**Expected result:** Four job tests pass, including the negative JSON baseline. The demo reports revision 4 for both snapshots, `advanced: true` for B, `advanced: false` for A, and a reopened revision-5 record containing `[extract, index]`. The crash drill separately reports two effects for an unsafe retry and one for the modeled idempotent effect service.

**Acceptance check:** Save the report and explain the zero-row update. The record's revision and artifact references must remain coherent across a fresh connection, while a terminal record rejects further work. State that this check does not establish exactly-once external effects, implement the complete background-worker lifecycle, or make the original JSON store safe for concurrent workers.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
