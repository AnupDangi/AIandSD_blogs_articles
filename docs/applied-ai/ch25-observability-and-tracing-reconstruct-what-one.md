# Chapter 25 — Observability and tracing

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 25*

## Learning outcomes

Trace one AI run across model, retrieval, and tool operations; use span timings to locate a bottleneck; and choose useful trace attributes while protecting sensitive data.

**Prerequisite:** A multi-step AI workflow with observable model, retrieval, or tool calls.

## Figure walkthrough

One parent trace represents the user run. Child spans represent retrieval, model calls, and tools; their durations and linked identifiers let the reader follow the request and find the slow or failed operation.

**Authored instructional mechanism map — one sequential latency waterfall.** The durations use the source's example; the table is not a trace captured from a real system.

| Parent/child span | Example start → end | Duration | Investigation use |
|---|---|---|---|
| Parent: answer request | `0.0 s → 14.0 s` | `14.0 s` | Correlates the entire request |
| Child: retrieval | `0.0 s → 0.3 s` | `0.3 s` | Small share of this example's wall time |
| Child: tool call (duration includes the wait on the dependency) | `0.3 s → 10.3 s` | `10.0 s` | Dominant span; investigate dependency wait first |
| Child: model work | `10.3 s → 14.0 s` | `3.7 s` | Remaining example work after tool wait |

**Read from top to bottom:** request ID links the children to their parent; safe status/error attributes explain each span's outcome. This authored sequential arrangement sums to 14 seconds. Real spans may overlap, so summing child durations can overcount wall time. A deterministic toy workflow with no real model or tool calls has no such spans; mark those not executed until instrumentation exists.

## Reconstruct a run

A **trace** represents one end-to-end execution. A **span** is a timed unit such as a model call, retrieval query, or tool operation. Structured attributes can identify model, token counts, tool name, latency, error class, and correlation IDs. Create the trace ID at ingress, nest spans for child work, and correlate operational logs and metrics to that run.

Traces answer “what happened in this request?” Metrics help show how often a condition occurs across requests. Use both: an aggregate can reveal a rising p95 while an individual trace shows which dependency caused the delay. Sampling expensive traces can control volume, but retain enough failures to investigate rare incidents.

## Worked example

The source example is a 14-second answer with 300 ms retrieval, 10 seconds waiting on one tool, and 3.7 seconds of model time. A correlated trace shows that tuning retrieval would barely affect the total. The long tool span is the first investigation target.

## Practice lab

Start with the workflow in your own TypeScript project, or a small local retrieval-and-answer function if you have none yet. Assume it exposes a request ID, answer status, and citations but no tracing library. Build a trace worksheet using Node's `performance.now()` or a small hand-written span recorder; adding OpenTelemetry is an optional follow-on:

1. Run one fixed test query and record its request ID, status, citations, and elapsed time.
2. Identify which desired spans are absent. If your workflow makes no model or tool call, label those spans **not executed** instead of inventing timings.
3. Add a local retrieval span around a controlled query and a synthetic slow function as a separate child span; record elapsed time and safe attributes without logging unrestricted prompts or secrets.
4. Trigger a transient retrieval timeout and follow its error or fallback status in a second trace worksheet.
5. Compare the span timings with total elapsed time and explain any uninstrumented gap. Document a sampling rule that retains failure evidence.

**Deliverable:** one successful trace, one failed trace, and a short latency waterfall analysis.

## Failure review

- Prompt logging without privacy controls can expose user data.
- Missing correlation between tool logs and the agent trace makes reconstruction unreliable.
- Per-user IDs as metric labels create high-cardinality metrics; keep high-cardinality details in traces or logs instead.
- Sampling that drops all rare failures prevents diagnosis.

## Recall

- What distinguishes a trace from a span?
- Which span dominates the example’s wall-clock time?
- Which attributes help reconstruction without exposing sensitive content?

## Sources

- [OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenAI tracing guide](https://developers.openai.com/api/docs/guides/agents-api/tracing)

## Try the simulation

Use the **`evaluation-console`** and select **Retrieval span missing**. Compare the required span list with the recorded spans, then choose **Uncorrelated spans**: all six spans are present, but they carry two different trace IDs, so their shared request cannot be reconstructed. These are authored examples, not live telemetry; the exercise below still requires you to design safe trace attributes.

## Course project — milestone 4 — Evaluation

**Task:** In your own TypeScript project, add a small span recorder (a function that starts a span with a name, parent, and start time, and ends it with a duration and a status). Wrap one request so it produces a parent span for the request and a child span for each real step, for example retrieval. Record safe attributes only: query length rather than the query text, allowed source IDs, retrieved evidence IDs, result status, and elapsed time. Steps your project does not perform stay marked **not executed** with no timing. Write a Vitest or `node:test` test that runs one request with a fake clock and asserts that every child span carries the parent's trace ID, that child durations are non-negative, and that the failed-retrieval path ends its span with an error status. Add a second assertion that no span attribute contains the raw prompt text.

**Acceptance check:** Each trace field has an owner and is marked observed (your recorder emits it) or requiring instrumentation (not yet emitted). The recorder is a local teaching tool; it is not a distributed tracing system.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
