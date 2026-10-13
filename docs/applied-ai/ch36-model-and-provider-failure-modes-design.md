# Chapter 36 — Model and provider failure modes

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 36*

## Learning outcomes

After this lesson, you should be able to:

- Distinguish transient transport or capacity failures from invalid requests and programming errors.
- Set an attempt limit and deadline, then explain why retrying a side-effecting operation requires idempotency or reconciliation.
- Distinguish a successful answer, a successful search with no evidence, and an unavailable result in logs and user-facing behavior.

**Prerequisite:** Chapters 28–29, which introduce run budgets, retries, and graceful degradation.

## Figure walkthrough

A provider call crosses a dependency boundary. Classify its outcome first. A transient timeout or connection failure may receive a bounded retry while budget remains; a malformed request should be corrected; an exhausted transient path should become a clear unavailable result. A programming defect should remain visible to developers rather than being disguised as a provider outage.

**Authored instructional mechanism map — outcome classification at a dependency boundary.** This table connects the chapter's local exception fixtures with the proposed production contract.

| Observed result | Local fixture observation or proposed response | Next action |
|---|---|---|
| One `TimeoutError`, then success | Local `recovered` after two calls | Return recovered result; retain attempt evidence |
| Repeated transient retrieval failures | Local `unavailable`, empty citations | Stop at the two-attempt bound; do not label it no evidence |
| `ValueError` programming defect | Local one call, exception propagates | Expose the defect to developers rather than hide it as outage |
| Successful empty search | Local `not_found` | No dependency recovery is needed |
| Timed-out side-effecting tool | Proposed: remote effect may already exist | Reconcile by idempotency key or remote state before retry |
| Invalid schema or unauthorized request | Stop and surface a repairable error | The same request will fail again. |
| Rate limit or temporary capacity response | Respect provider guidance; retry only within a shared deadline and attempt budget | Unbounded retries can add load during an outage. |

**Proposed 900 ms budget:** first attempt up to `600 ms` → delay up to `100 ms` → final attempt or unavailable response within the remaining `200 ms`. Validation and response must fit the same total; in-flight calls need actual cancellation/timeouts. The starter checks its deadline only before starting an attempt. One retry owner prevents a 3-attempt gateway and 3-attempt adapter from multiplying into as many as nine provider calls.

## Treat the provider as a dependency

A hosted model endpoint can rate-limit, time out, return invalid data, change behavior after a model update, or become unavailable. These outcomes need different responses. A capacity error might improve after waiting. An invalid schema will not be fixed by retrying the same bytes. A timeout leaves uncertainty about whether a remote operation completed, which matters if it can charge money or cause another side effect.

Define an operational contract for each call: deadline, retryable error classes, maximum attempts, fallback or unavailable behavior, and the status visible to the caller. Put the policy in application code. Record path, attempt count, duration, and sanitized error class; avoid logging secrets or unnecessary prompt content. The mechanism map above already lists each observed outcome and its next action.

The table is a policy sketch, not a mapping from every provider HTTP status to one action. Give the whole operation one deadline, including backoff, a possible fallback, and response validation. For example, a 900 ms user budget might reserve 600 ms for the first attempt, 100 ms for delay, and 200 ms for a final attempt or unavailable response. A client timeout must actually interrupt or bound each in-flight call; the starter's pre-attempt clock check cannot do that.

## Worked example: classify before retrying

The course starter’s `bounded_retry` checks a 0.25-second default deadline **before** each attempt and allows at most two attempts. It does not cancel a call already running beyond that deadline. It retries only `TimeoutError` and `ConnectionError`, with a short bounded delay and no jitter. If a mock operation times out once and returns on the next call, the observable result is `recovered` after two calls. If the operation raises `ValueError`, it is called once and the programming error propagates. If both transient attempts fail inside `DocumentIntelligence.answer`, the application returns status `unavailable` with no citations; it does not invent a fallback answer.

These are local deterministic control-flow examples, not measurements of a live provider’s timing, rate limits, or reliability. A production fallback—such as a second model—would need its own format, quality, privacy, and cost evaluation.

An additional trap is retry multiplication. If an API gateway retries three times and its model adapter also retries three times, one user action can create as many as nine provider attempts. Choose one retry owner, propagate the remaining deadline, and record an idempotency key for any operation whose effect matters. Backoff with jitter can spread contention, but it cannot repair invalid input or restore a depleted budget.

## Practice lab

From `projects/document-intelligence`, run:

```sh
python -m unittest discover -s tests -p 'test_course_project.py' -k 'retry_' -v
python -m unittest discover -s tests -p 'test_course_project.py' -k 'transient_retrieval_' -v
```

Inspect the tests named `test_retry_is_bounded_and_succeeds_after_one_transient_failure`, `test_retry_does_not_retry_programming_errors`, `test_transient_retrieval_failure_retries_then_returns_unavailable_without_citations`, and `test_non_transient_retrieval_error_is_not_hidden_as_unavailable_or_no_match`. For each, write the injected exception, call count, and final result in a four-row table.

**Expected observation:** transient recovery uses two calls; `ValueError` uses one and propagates; two transient retrieval failures produce `unavailable` with an empty citation tuple; a non-transient retrieval error is not mislabeled as `not_found` or `unavailable`. Then propose one production metric and one idempotency safeguard for a hypothetical side-effecting tool call. The starter does not implement a live provider or side-effecting tool.

For your proposed production contract, fill in the 900 ms timeline above. State the number of permitted attempts, the per-attempt timeout, the fallback time, and the status after exhaustion. Check that the worst-case sum fits the deadline. For a hypothetical `create_ticket` tool, specify the key's scope and what remote read or stored result would resolve an uncertain timeout; saying “retry safely” is insufficient.

## Failure review

- Retrying every error can waste budget or amplify load.
- A timeout does not prove a side effect did not happen; make writes idempotent or reconcile state before retrying.
- A fallback that violates the same task contract can produce plausible but unusable output.
- A deadline must include retry delay and fallback time, not only the first request.
- Provider and model changes invalidate assumptions; rerun representative evaluations.

## Recall

- Which exception classes does the local retry helper actually catch?
- What result distinguishes exhausted retrieval from a successful search with no match?
- What state must be reconciled before retrying a timed-out write?

## Sources

- [OpenAI rate limits guide](https://developers.openai.com/api/docs/guides/rate-limits) — provider-specific limits and handling; inspect current account and model limits before setting policy.
- [OpenAI error codes](https://developers.openai.com/api/docs/guides/error-codes) — provider-specific error categories; do not assume these map one-to-one to the starter’s Python exceptions.
- [Amazon Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) — dependency budgets, amplification, and jitter.
- [Amazon Builders' Library: Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) — handling ambiguous outcomes for side effects.

## Try the simulation

Use the **`production-tabletop`** trace to compare **Retry every error twice**, **Retry transient errors; fail over on permanent errors**, and **Stop after the first provider error**. Predict how each policy handles both the transient timeout and the permanent invalid-credential error, then advance one transition at a time. Notice that retrying everything repeats the permanent error and delays the fallback, that the fail-over policy caps the transient retry and switches to the known-good fallback, and that **Stop after the first provider error** is the unavailable-with-evidence analogue: it fails clearly and safely but gives up even when a bounded retry could recover. This is a fixed teaching scenario; the starter tests demonstrate bounded retry behavior, not production backoff or provider behavior.

## Course project — milestone 7 — Efficiency & recovery

**Efficiency evidence task:** Add the four test observations to the project’s failure-drill report. For the transient path, include attempts and final status; for the programming error, show that it remains visible. Add an explicit note that the local retry is bounded but is not a production provider adapter, and explain how you would prevent a timed-out side-effecting request from duplicating work.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m unittest discover -s tests -p 'test_course_project.py' -k 'retry_' -v
python -m unittest discover -s tests -p 'test_course_project.py' -k 'transient_retrieval_' -v
```

**Expected result:** The retry and failure-classification tests pass. The injected transient retrieval failure becomes `unavailable` without citations; programming errors are not converted into success or no-match results.

**Acceptance check:** Report the observed call counts and statuses accurately, name one idempotency or reconciliation control, distinguish the pre-attempt deadline check from an in-flight timeout, and do not describe the local tests as a provider incident.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
