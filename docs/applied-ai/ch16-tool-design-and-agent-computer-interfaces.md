# Chapter 16 — Tool Design and Agent-Computer Interfaces

*Make actions narrow, typed, and observable*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 16.*

## Learning outcomes

- Split broad operations into narrow tools.
- Define typed arguments and machine-readable errors.
- Measure tool selection, argument, and side-effect outcomes.

## Before you begin

Chapter 15; basic APIs and JSON.

## Why this matters

Agent reliability often depends more on tool interface quality than on adding model intelligence. Ambiguous names, large schemas, and noisy outputs create avoidable failures.

## Visual model

> **Source figure description retained:** Agent request → narrow typed tool contract → authorization/validation → operation with ID → concise result and classified error.

**Authored instructional mechanism map — narrow self-service profile tool.** This is a proposed tool boundary using the chapter's `UpdateProfileArgs` example.

| Gate | Input or operation | Application-owned rule |
|---|---|---|
| Select tool | `update_user_profile` rather than a 25-field `manage_user` operation | Keep responsibility and possible side effects explicit |
| Validate arguments | Required `display_name` string | Reject missing or malformed fields before executing |
| Resolve target | Authenticated caller's user ID | Do not trust a model-provided target identity |
| Authorize and execute | Update only permitted profile fields for that target | A separate admin action needs its own contract and policy |
| Return result | Concise status, operation ID, typed error category | Classify transient/permanent errors; expose no unrelated rows |
| Retry/replay | Same operation identity where the operation supports idempotency | Avoid repeating a side effect solely because its response was lost |

**Boundary:** model-proposed arguments → typed validation + trusted identity + authorization → operation → bounded result. An operation ID helps correlation but only prevents duplicate effects when the handler enforces its semantics. `CheckpointStore` replay illustrates stored-stage behavior; it does not implement this profile tool or an atomic external write.

## Try the simulation

Open lesson `ai-16` and advance the **agent-state-machine** to “Check evidence.” Predict what the state banner will say when you select **Replay the tool result**. Inspect the outcome and explain why the idempotency key must bind to the original operation. The visual does not execute a tool or validate arguments; use the `CheckpointStore` test below to inspect actual stage-ID replay.

## Concepts to retain

### Narrow responsibility

Each tool should perform one coherent operation.

### Typed contract

Parameters, outputs, and errors should be machine-checkable.

### Observability

Record identity, timing, result, and side-effect status for each call.

## How it works

1. Name tools by intent.
2. Use constrained enums and required fields.
3. Return concise machine-readable results.
4. Classify transient versus permanent errors.
5. Expose idempotency or operation IDs for side effects.

## Worked example

A `manage_user` tool with 25 optional fields is harder to reason about than `read_user`, `update_user_profile`, and `disable_user`. Narrow tools make their inputs and side effects easier to inspect and govern.

## Implementation sketch (pseudocode)

```python
class UpdateProfileArgs(BaseModel):
    display_name: str

# The handler derives the target user ID from authenticated context,
# not from a model-supplied argument. It returns an operation ID and
# a typed error category.
```

For this self-service profile tool, the authenticated user's identity determines the target. A separate administrative operation would need its own narrow contract and explicit authorization policy.

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Wrong-tool selection rate.
- Malformed argument rate.
- Side-effect success, duplicate-operation, and error rates.

## Failure modes to reason about

- Returning entire database tables from tools.
- Describing parameters only in prose.
- Retrying non-idempotent actions without operation IDs.
- Giving the agent tools it does not need.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Define one narrow local tool contract with a `dataclass`, typed fields, and explicit error results. Derive the acting identity from a trusted local context rather than a caller-provided field.
- Split a broad illustrative operation into read-only and state-changing functions.
- Add a test case for a malformed argument and a duplicate operation ID.
- Use only local functions; the starter does not expose model-callable tools.

## Course project — milestone 3: Workflow

**Task:** Connect narrow interfaces to the project’s typed `Answer` contract and source allowlist test. The starter exposes Python functions, not model-callable tools.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "answer_contract" -v
```

**Expected observation:** The contract test passes and a citation outside the allowed set raises `ValueError`.

**Acceptance check:** Your proposed tool boundary names inputs, output, side effect, and identity source explicitly, while noting that the current project has no agent tool registry or model tool calls.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- How does tool scope affect the possible side effects?
- Why distinguish transient from permanent errors?
- What does an operation ID enable?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Anthropic — Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents)
- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
