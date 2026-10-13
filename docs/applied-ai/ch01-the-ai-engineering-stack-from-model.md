# Chapter 01 — The AI Engineering Stack

*From model call to production system*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 01.*

## Learning outcomes

- Distinguish model capability from product capability.
- Map external dependencies and identify who owns business state.
- Choose task-level measures for quality, latency, cost, and failure.

## Before you begin

Basic programming and familiarity with an API request/response cycle.

## Why this matters

An AI product is a system, not a model. The model is one probabilistic component inside an application that also owns context, tools, state, validation, user experience, observability, security, and economics.

## Visual model

> **Source figure description retained:** System map: user journey → application/control plane → model, retrieval, tools, storage, and external APIs; validation and observability surround the flow.

**Authored instructional mechanism map — support assistant.** This accessible map develops the source description; it is not a recovered PDF figure.

| Stage | Information or operation | Boundary the application owns |
|---|---|---|
| 1. Check request identity | Authenticate the caller and verify tenant scope | Reject the request before any data access |
| 2. Retrieve current evidence | Fetch the applicable account policy passages | Apply document access rules before evidence reaches the model |
| 3. Generate a bounded answer | Model drafts an answer citing the retrieved evidence | Enforce request budget and typed response contract |
| 4. Validate citation IDs | Resolve each cited source ID to a retrieved passage | Withhold the answer if a citation falls outside the retrieved set |
| Across stages 1–4 | Correlate quality, elapsed time, failure category, and resource use | Record safe trace attributes; do not make the model the state owner |

**Follow the failure path:** if step 3 returns malformed JSON, step 4 rejects the candidate. It does not undo the identity check in step 1 or make a second unrestricted tool call. In the local project, the optional fixture adapter copies a passage deterministically; no real model or order service is called.

## Try the simulation

Open lesson `ai-01` and use the request workbench. First predict where a request should stop if identity validation fails. Select **Identity check fails**, then inspect the trace: later stages should be marked skipped. Repeat with **No current evidence** and **Citation points outside retrieved evidence**. Explain why an answer is withheld at each boundary. The trace is a deterministic teaching fixture, not a live request or measured service.

## Concepts to retain

### Probabilistic core

Model outputs can vary while surrounding software remains deterministic.

### System objective

Optimize useful task success, not a benchmark score in isolation.

### Control plane

Budgets, routing, evaluation, permissions, and deployment policy sit around the model.

## How it works

1. Separate model capability from product capability.
2. Make every external dependency explicit: retrieval, tools, storage, and APIs.
3. Define success at the user-journey level.
4. Instrument cost, latency, quality, and failures from the first prototype.
5. Keep deterministic operations in code when semantic reasoning is unnecessary.

## Worked example

A support assistant receives a question, retrieves account policy, calls an order API, validates the result, and returns a cited answer. The model handles reasoning and language; identity, authorization, data access, and side effects remain application responsibilities.

## Implementation sketch (pseudocode)

```python
result = component(input, policy=policy)
validate(result)
record_trace(input, result, latency_ms, cost)
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Task success on representative cases.
- p50/p95 latency and the slowest span (a span is one timed step in a trace).
- Cost or resource consumption per successful task.
- Failure rate by explicit error category.

## Failure modes to reason about

- Treating a demo prompt as the whole architecture.
- Letting the model become the source of truth for business state.
- Adding retrieval, agents, or memory before establishing a baseline.
- Monitoring tokens but not user task success.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Trace the checked-in fixture request through `pipeline.py`, `models.py`, and `safety.py`.
- Draw the deterministic boundary around retrieval, answer extraction, and citation validation.
- Run the chapter’s project check and record one failure condition the test suite covers.
- Keep any live-provider call as a separately labeled optional extension; it is not needed for this lab.

## Course project — milestone 1: Model boundary

**Task:** Run one fixture question through retrieval, the typed request and budget check, the deterministic adapter, structured-output parsing, and source-span validation. Trace the path through `document_intelligence/model_workflow.py`, `model_boundary.py`, `models.py`, and `pipeline.py`.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "fixture_question_returns_only_cited_allowed_evidence" -v
python -m document_intelligence "How can the previous index roll back?"
python -m document_intelligence --fixture-model "How can the previous index roll back?"
python -m unittest discover -s tests -p "test_course_project.py" -k "fixture_model_cli" -v
```

**Expected observation:** Both CLI modes report `status: answered` and citation `ops-02`. The fixture-adapter mode reports the toy input/context estimate, copies its evidence excerpt verbatim, and exposes the source offsets; the request ID is intentionally different each run.

**Acceptance check:** Your trace identifies where documents are loaded, filtered, searched, budgeted, adapted, parsed, and validated. Explain that the fixture adapter is deterministic passage copying, not a language model, and that schema/citation checks do not prove semantic support for a generated paraphrase.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- Redraw the system boundary and identify state owners.
- Name one correctness, latency, and cost failure.
- Describe one design decision that changes for a high-risk workload.

### Completion check

Explain in your own words whichever trade-off your experiment surfaced (for example, latency against quality, or cost against coverage), show the lab artifact, and identify one failure case it exposed.

## Further reading

- [Chip Huyen — Building LLM applications for production](https://huyenchip.com/2023/04/11/llm-engineering.html)
- [Chip Huyen — Common pitfalls when building generative AI applications](https://huyenchip.com/2025/01/16/ai-engineering-pitfalls.html)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
