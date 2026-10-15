# Chapter 29 — Retries, fallbacks, and graceful degradation

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 29*

## Learning outcomes

Classify errors before retrying, bound retries by count and deadline, and design a degradation ladder whose outcomes have been evaluated.

**Prerequisite:** Chapters 27–28, latency and shared resource budgets.

## Figure walkthrough

A degradation ladder moves from normal behavior to lower-feature modes as errors or budgets require. Each transition is explicit, tested, observable, and bounded by the same user-facing quality contract.

**Authored instructional mechanism map — classify, bound, degrade.** The rungs are a proposed policy, not an implementation the course supplies.

| Decision/rung | Eligible path | Observable outcome |
|---|---|---|
| Classify error first | Transient timeout/capacity versus invalid request/forbidden action | Permanent error stops unchanged retries |
| `NORMAL` | Required stages and optional reranking fit remaining budget | Return validated full-feature result |
| Bounded retry | Error is retryable and another attempt fits count plus shared deadline | Record attempt/delay; stop at the bound |
| `DEGRADED` | Skip optional reranking only if that path meets the minimum quality gate | Label the lower-feature response and trace path |
| `MINIMAL` | Required work cannot finish within the contract | Return clear unavailable/partial behavior defined in advance; invent no supporting evidence |

**Chapter counterexample:** a reranker taking `4 s` instead of `0.3 s` can consume a `12 s` objective with repeated attempts. Three four-second calls alone leave no time for other work. Treat this as an analytical risk, not a measured outage. A lower-feature path must be evaluated before it becomes a fallback; a pre-attempt deadline check in a simple retry helper cannot interrupt an already-running call.

## Retry deliberately

A transient error may succeed later, such as a temporary rate limit, service-unavailable response, or network reset. A permanent error—such as an invalid schema or forbidden action—will not be repaired by repeating the same request. Honor a provider’s retry guidance when present, use bounded exponential backoff with jitter for eligible errors, and stop when the retry budget or end-to-end deadline is exhausted.

A **degradation ladder** defines lower-cost or lower-feature modes in advance. It might skip optional reranking, return a partial but clearly labeled result, or ask the user to retry. A fallback model is useful only if it passes the same task contract and evals. Expose degraded service in traces and user experience.

## Worked example

If a reranker slows from 300 ms to 4 seconds and the interactive objective is 12 seconds, retrying it twice may cause the entire answer to miss its deadline. Skipping the optional reranker may better preserve the user journey, if the no-reranker path meets the minimum quality bar.

## Practice lab

1. Write a small retry helper with a two-attempt limit and a pre-attempt deadline check, and wrap fake operations with it. For a timeout followed by success, repeated connection failure, and a validation error (a permanent error), predict the attempt count first, then record the count your test observes.
2. Explain how a two-attempt limit and pre-attempt deadline check differ from a production end-to-end retry budget. A helper like this cannot interrupt an operation that runs past its deadline.
3. Check that the validation error propagates after one call. For the repeated transient failure, check that the helper returns an `unavailable` result with empty citations.
4. Sketch a three-rung `NORMAL` / `DEGRADED` / `MINIMAL` policy. Mark optional reranking and provider fallback as proposed; the sketch does not switch providers or measure live p95 latency.
5. Define how a future test would compare useful-response rate and p95 under the same set of test inputs and shared deadline.

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

Use the **`production-tabletop`** trace to compare **Retry without an attempt deadline**, **One bounded attempt, then serve the cached response**, and **One short retry, then cached response**. Predict what arrives before the 900 ms deadline, then advance each path one transition at a time. Check the elapsed times and whether the returned cache preserves its evidence metadata. The fixed timings are illustrative; the exercise below tests bounded attempts and permanent-error behavior.

## Course project — milestone 5 — Reliability

**Task:** In your own TypeScript project, add or review the retry helper around one dependency call (for example retrieval or a model request). Give it an error classifier that marks timeouts, rate limits, and service-unavailable errors as transient and validation errors as permanent, a fixed attempt bound, and a pre-attempt deadline check. Write Vitest or `node:test` tests with fake operations. Assert that a permanent error is thrown after exactly one call. Assert that an operation that always times out stops at the attempt bound and returns the `unavailable` result with empty citations. Assert that a timeout followed by success returns the success and records two attempts. Then describe in prose how a production caller would enforce a real call timeout, for example by passing an `AbortSignal` to the request, since the helper itself cannot interrupt an in-flight call.

**Acceptance check:** Record the terminal outcome and attempt count for each test case. Do not claim provider fallback unless you separately build and test it.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
