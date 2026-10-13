# Chapter 29 — Retries, fallbacks, and graceful degradation

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 29*

## Learning outcomes

Classify errors before retrying, bound retries by count and deadline, and design a degradation ladder whose outcomes have been evaluated.

**Prerequisite:** Chapters 27–28, latency and shared resource budgets.

## Figure walkthrough

A degradation ladder moves from normal behavior to lower-feature modes as errors or budgets require. Each transition is explicit, tested, observable, and bounded by the same user-facing quality contract.

**Authored instructional mechanism map — classify, bound, degrade.** The rungs are a proposed policy, not provider switching implemented by the starter.

| Decision/rung | Eligible path | Observable outcome |
|---|---|---|
| Classify error first | Transient timeout/capacity versus invalid request/forbidden action | Permanent error stops unchanged retries |
| `NORMAL` | Required stages and optional reranking fit remaining budget | Return validated full-feature result |
| Bounded retry | Error is retryable and another attempt fits count plus shared deadline | Record attempt/delay; stop at the bound |
| `DEGRADED` | Skip optional reranking only if that path meets the minimum quality gate | Label the lower-feature response and trace path |
| `MINIMAL` | Required work cannot finish within the contract | Return clear unavailable/partial behavior defined in advance; invent no supporting evidence |

**Chapter counterexample:** a reranker taking `4 s` instead of `0.3 s` can consume a `12 s` objective with repeated attempts. Three four-second calls alone leave no time for other work. Treat this as an analytical risk, not a measured starter outage. A lower-feature path must be evaluated before it becomes a fallback; the local helper's pre-attempt check cannot interrupt an already-running call.

## Retry deliberately

A transient error may succeed later, such as a temporary rate limit, service-unavailable response, or network reset. A permanent error—such as an invalid schema or forbidden action—will not be repaired by repeating the same request. Honor a provider’s retry guidance when present, use bounded exponential backoff with jitter for eligible errors, and stop when the retry budget or end-to-end deadline is exhausted.

A **degradation ladder** defines lower-cost or lower-feature modes in advance. It might skip optional reranking, return a partial but clearly labeled result, or ask the user to retry. A fallback model is useful only if it passes the same task contract and evals. Expose degraded service in traces and user experience.

## Worked example

If a reranker slows from 300 ms to 4 seconds and the interactive objective is 12 seconds, retrying it twice may cause the entire answer to miss its deadline. Skipping the optional reranker may better preserve the user journey, if the no-reranker path meets the minimum quality bar.

## Practice lab

1. Run the starter's retry tests and record the attempt count for a timeout followed by success, repeated connection failure, and `ValueError`.
2. Inspect `resilience.py` and `pipeline.py`; explain how their two-attempt limit and pre-attempt deadline check differ from a production end-to-end retry budget. The helper cannot interrupt an operation that runs past its deadline.
3. Inspect the existing `ValueError` test and check that it propagates after one call. Keep the transient-failure test's `unavailable` result and empty citations.
4. Sketch a three-rung `NORMAL` / `DEGRADED` / `MINIMAL` policy. Mark optional reranking and provider fallback as proposed; this starter does not switch providers or measure live p95 latency.
5. Define how a future test would compare useful-response rate and p95 under the same fixture distribution and shared deadline.

**Deliverable:** an error classification table with observed local call counts, a proposed degradation policy, and a plan for measuring it.

## Failure review

- Retrying every failure can create retry storms and waste cost.
- Immediate retries synchronize clients and increase load; bounded backoff with jitter helps avoid that pattern.
- A fallback model may have incompatible tool behavior or output format.
- Users and operators need a signal that a response was degraded.

## Recall

- Which errors should not be retried unchanged?
- What budget limits retries?
- What quality evidence permits skipping an optional stage?

## Sources

- [AWS Builders’ Library: Timeouts, retries, and backoff with jitter](https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter)
- [OpenAI rate limits guide](https://developers.openai.com/api/docs/guides/rate-limits)

## Try the simulation

Use the **`production-tabletop`** trace to compare **Retry without an attempt deadline**, **One bounded attempt, then serve the cached response**, and **One short retry, then cached response**. Predict what arrives before the 900 ms deadline, then advance each path one transition at a time. Check the elapsed times and whether the returned cache preserves its evidence metadata. The fixed timings are illustrative; the local task tests bounded attempts and permanent-error behavior.

## Course project — milestone 5 — Reliability

**Task:** Inspect `resilience.py`. It accepts an operation and bounded attempts but does not classify provider-specific errors or interrupt an in-flight call. The existing `ValueError` test demonstrates a permanent failure after one call; extend the failure-drill report with its observed result, then describe how a production caller would classify transient errors and enforce a real call timeout.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m unittest discover -s tests -p 'test_course_project.py' -k 'retry_' -v
python -m unittest discover -s tests -p 'test_course_project.py' -k 'transient_retrieval_failure' -v
```

**Expected result:** Tests pass; the existing permanent-failure test records one call and the transient-failure tests record at most two attempts.

**Acceptance check:** Record terminal outcome and attempt count; do not claim provider fallback unless separately built and tested.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
