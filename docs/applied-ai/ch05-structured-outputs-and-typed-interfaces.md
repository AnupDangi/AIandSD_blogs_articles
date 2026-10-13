# Chapter 05 — Structured Outputs and Typed Interfaces

*Turn probabilistic text into dependable program inputs*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 05.*

## Learning outcomes

- Define a compact typed output contract.
- Separate parse/schema failures from semantic failures.
- Design validation and bounded repair behavior.

## Before you begin

Chapters 1–2; basic Python types or JSON.

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

**Failure branch:** a rejected record returns an explicit error or a bounded correction request. It never loops indefinitely or enters trusted application code just because it is valid JSON. The course fixture uses answer/citation contracts rather than this illustrative invoice schema.

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

```python
class Invoice(BaseModel):
    customer: str
    currency: str
    subtotal: Decimal
    tax: Decimal
    total: Decimal

# Domain checks follow parsing/schema validation.
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

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

- Use Python `dataclasses` and `json` to define a small local ticket record with required fields — the same typed-record pattern as the invoice example above, with support-request fields instead of invoice totals.
- Parse one valid fixture and reject a missing required field with a clear error.
- Add one separate domain check and show that a correctly typed but invalid value can still fail it.
- Keep the exercise offline; Pydantic and a model API are optional extensions, not requirements.

## Course project — milestone 1: Model boundary

**Task:** Inspect `ModelRequest`, `Answer`, and `model_boundary.parse_structured_answer`. Run the malformed-output fixture test, then change a local copy of the fixture result to include an unknown citation or mismatched request ID. Explain which structural and source-scoping checks are enforced and which semantic claims are not checked by a schema.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "answer_contract" -v
python -m unittest discover -s tests -p "test_course_project.py" -k "model_boundary_accepts_typed_answer_and_rejects_malformed_output" -v
```

**Expected observation:** Both tests pass. The strict parser rejects malformed JSON, wrong field types, extra fields, a mismatched request ID, and citations outside this request. It returns a `ModelAnswerCandidate`, not a grounded application `Answer`: the candidate has no inspectable spans. Application `Answer` objects marked `answered` require source spans that map to every citation; the candidate must pass a separate grounding step before it can become one.

**Acceptance check:** Your evidence includes one accepted fixture and at least one typed `ModelBoundaryError` from a rejected result. Distinguish allowed citation/status invariants from factual truth; the starter does not claim schema validation proves a statement is true or that a model generated the fixture.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

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
