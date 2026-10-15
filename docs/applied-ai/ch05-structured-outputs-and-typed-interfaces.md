# Chapter 05 — Structured Outputs and Typed Interfaces

*Turn probabilistic text into dependable program inputs*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 05.*

## Learning outcomes

- Define a compact typed output contract.
- Separate parse/schema failures from semantic failures.
- Design validation and bounded repair behavior.

## Before you begin

Chapters 1–2; basic TypeScript types or JSON.

## Why this matters

Applications are easier to test and compose when model outputs follow a constrained contract that can be validated before downstream code trusts them.

## Visual model

> **Source figure description retained:** Typed boundary: model response → parse → schema validation → domain validation → trusted application code, with failures routed explicitly.

**Authored instructional mechanism map — invoice validation gates.** This table expands the source boundary description using the chapter's invoice example.

| Gate, in execution order | Example input | Result and next action |
|---|---|---|
| Parse | Truncated JSON or free-form prose | Parse failure: do not call downstream invoice code |
| Check schema | Required `total` is missing, or contains text instead of a number | Structural failure: report the contract violation |
| Check domain invariants | Numeric `total = -900` | Schema may pass; non-negative-total rule rejects the value |
| Check arithmetic | All amounts are numeric | Compare subtotal plus tax with total under the application's stated currency/rounding rules |
| Accept for application use | Candidate passes the required gates | Pass the validated record to deterministic code; this still does not prove the source invoice was read correctly |

**Failure branch:** a rejected record returns an explicit error or a bounded correction request. It never loops indefinitely or enters trusted application code just because it is valid JSON. Your own project will more likely use an answer/citation contract than this illustrative invoice schema.

## Try the simulation

Open lesson `ai-05` and use the request workbench's **Example response** selector. Predict which records pass before choosing **Valid answer**, **Missing answer field**, **Contradictory not-found result**, and **Unknown citation ID**. Compare the schema-shape, answer/status, and citation-allowlist checks. Notice that passing these toy checks still does not establish that cited evidence supports the answer.

## Concepts to retain

### Schema

Explicit fields, types, enums, and required properties.

### Validation

Reject or repair outputs that violate the contract.

### Semantic correctness

Schema-valid data can still be factually wrong; type safety is necessary but not sufficient.

## How it works

1. Define the contract before the prompt.
2. Use structured-output support when available.
3. Parse and validate at the boundary.
4. Distinguish parse failure from semantic failure.
5. Keep schemas small enough to inspect and test.
6. If repair is appropriate, allow a fixed number of attempts and return an explicit failure when the same invalid result persists. A deterministic domain violation should usually trigger a correction path, not a blind replay.

## Worked example

An invoice extractor returns typed customer, currency, subtotal, tax, and total fields. A total of `-900` can satisfy a numeric type while violating a domain rule. Validate non-negative totals and arithmetic consistency separately.

## Implementation sketch (pseudocode)

```ts
type Invoice = {
  customer: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
};

// Domain checks follow parsing and schema validation.
```

This is an illustrative pseudocode sketch, not a runnable command. Placeholder APIs or model operations are conceptual; the project path below can run offline with a stub in place of a model.

## What to measure

- Parse and schema-valid rates.
- Semantic-rule failure rate by field.
- Repair success rate and retries per request.

## Failure modes to reason about

- Parsing free-form prose with brittle regular expressions.
- Assuming schema validation proves truth.
- Using enormous, deeply nested schemas.
- Retrying unchanged requests indefinitely after deterministic validation errors.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Use a TypeScript `type` and `JSON.parse` to define a small local ticket record with required fields: the same typed-record pattern as the invoice example above, with support-request fields instead of invoice totals.
- Parse one valid sample string and reject a missing required field with a clear error.
- Add one separate domain check and show that a correctly typed but invalid value can still fail it.
- Keep the exercise offline; a schema library such as Zod and a model API are optional extensions, not requirements.

## Course project — milestone 1: Model boundary

**Task:** In your own TypeScript project, define the typed contract for the model's answer, for example `status` (an enum such as `answered` or `not_found`), `answer`, and a `citations` array of source IDs. Write a strict parse function that takes the raw model string and returns the typed value or throws a typed error (for example `ModelBoundaryError` with a `reason`). It should reject malformed JSON, wrong field types, extra fields, and citations outside the request's allowed source IDs. Write Vitest or `node --test` tests that feed the parser one valid string and one rejected string per rule, asserting the error type and reason in each case. Add one test where the status is `not_found` but citations are present, and assert it is rejected as contradictory.

**Acceptance check:** Your evidence includes one accepted input and at least one typed error from each rejected input. Distinguish the contract's invariants (shape, allowed citations, status consistency) from factual truth: a schema or citation check does not prove a statement is true or that the cited source supports it. If you keep a stub in place of a real model, say so.

### Recall without notes

- Give an example of schema-valid but semantically invalid output.
- Explain where domain validation belongs.
- Describe when a repair attempt should stop.

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [OpenAI — Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Pydantic documentation](https://pydantic.dev/docs/validation/latest/concepts/models/)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
