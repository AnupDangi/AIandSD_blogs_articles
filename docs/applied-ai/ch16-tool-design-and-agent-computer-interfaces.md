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

**Boundary:** model-proposed arguments → typed validation + trusted identity + authorization → operation → bounded result. An operation ID helps correlation but only prevents duplicate effects when the handler enforces its semantics. Replaying a stored stage result, as in the milestone 3 workflow task, illustrates the idea; it does not implement this profile tool or an atomic external write.

## Try the simulation

Open lesson `ai-16` and advance the **agent-state-machine** to “Check evidence.” Predict what the state banner will say when you select **Replay the tool result**. Inspect the outcome and explain why the idempotency key must bind to the original operation. The visual does not execute a tool or validate arguments; use a duplicate-operation-ID test in your own code, as in the lab below, to inspect actual replay behavior.

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

```ts
type UpdateProfileArgs = { displayName: string };

// The handler derives the target user ID from authenticated context,
// not from a model-supplied argument. It returns an operation ID and
// a typed error category.
```

For this self-service profile tool, the authenticated user's identity determines the target. A separate administrative operation would need its own narrow contract and explicit authorization policy.

This is an illustrative pseudocode sketch, not runnable code. Placeholder APIs or model operations are conceptual; the course project below can use small deterministic local data and no paid provider.

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

- Define one narrow local tool contract with a TypeScript type, typed fields, and explicit error results. Derive the acting identity from a trusted local context rather than a caller-provided field.
- Split a broad illustrative operation into read-only and state-changing functions.
- Add a test case for a malformed argument and a duplicate operation ID.
- Use only local functions; no model-callable tool or paid provider is needed.

## Course project — milestone 3: Workflow

**Task:** In your own TypeScript project, define each action your application can take (for example search the knowledge base, fetch a record, or write a note) as a narrow typed function with a clear name, validated arguments, a concise result and a classified error. Keep read-only and state-changing actions separate, and derive the acting identity from trusted context, never from an argument. Validate arguments at runtime with whatever schema approach you already use, and keep the same source allowlist check from your retrieval work on any action that returns evidence. Write a Vitest or `node --test` test that a malformed argument returns a typed error without running the effect, a test that a target ID supplied by the caller is ignored or rejected, and a test that repeating the same operation ID for a state-changing action does not repeat its effect.

**Acceptance check:** Your tool boundary names inputs, output, side effect and identity source explicitly, and the tests pass. Schema validation shows the shape is right, not that the action is authorized or sensible. If you have not connected a model to these functions, say so rather than calling them an agent tool registry.

Use small deterministic local data and test doubles in your tests. No API key is required, and this check does not claim model-generated quality.

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
