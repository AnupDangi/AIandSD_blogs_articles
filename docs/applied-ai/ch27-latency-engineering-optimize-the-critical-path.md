# Chapter 27 — Latency engineering

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 27*

## Learning outcomes

Build a latency waterfall from traces, distinguish the critical path from independent work, and test whether a proposed change improves end-to-end latency without breaking task quality.

**Prerequisite:** Chapter 25, observability and tracing.

## Figure walkthrough

A latency waterfall contains dependent stages on a critical path and independent branches that may overlap. The total is governed by dependencies and the slowest branch, so optimize the dominant end-to-end span.

**Authored instructional mechanism map — sequential versus parallel critical path.** These are the chapter's analytical durations, assuming independent tools and no queue/coordination overhead.

| Work | Sequential schedule | Parallel-tools schedule |
|---|---|---|
| Retrieval (0.4 s) | `0.0 → 0.4 s` | `0.0 → 0.4 s` |
| Tool A (2 s) | `0.4 → 2.4 s` | `0.4 → 2.4 s` |
| Tool B (3 s) | `2.4 → 5.4 s` | `0.4 → 3.4 s` |
| Generation can begin | At `5.4 s` | At `3.4 s`, after both required tool results |

**Dependency path:** retrieval → fork independent A/B → join after the slower B → generation. Analytical pre-generation time changes from `0.4 + 2 + 3 = 5.4 s` to `0.4 + max(2, 3) = 3.4 s`. If B requires A's result, the fork is invalid and the sequential dependency remains. These values omit generation and do not establish TTFT or end-to-end p95; collect actual spans and verify the same task-quality contract before adopting a change.

## Optimize the user journey

User-perceived latency comes from dependent stages. **Time to first token (TTFT)** is the elapsed time from request to the first generated token. The **critical path** is the dependent sequence that determines total wall-clock time. Independent operations may run in parallel, so their combined duration is closer to the slowest branch than the sum—provided they truly do not depend on one another.

Use traces to separate queueing, retrieval, prefill, decode, and tool time. Then target the dominant span. Generating fewer tokens, parallelizing independent work, and stopping optional work when a deadline is near are possible changes; each must be tested against the task’s quality requirements.

## Worked example

Retrieval takes 0.4 seconds. Tool A takes 2 seconds and tool B takes 3 seconds, and both tools are independent. Sequential execution takes about 5.4 seconds before generation. Parallelizing the tools reduces that portion to about 3.4 seconds (0.4 + max(2, 3)). This estimate assumes no added queue or coordination overhead; measure the real end-to-end path.

## Practice lab

1. Start with the 50 local fixture queries in the project probe below and record p50/p95; they contain no hosted model, queue, or network latency.
2. Time retrieval and answer assembly separately with local `perf_counter()` spans and compare their sum with measured total time. Label any gap and report the local timeout count.
3. Use the worked example’s two independent tools to calculate sequential versus parallel critical-path estimates. The starter has no such tools, so treat this as an analytical comparison unless you implement a controlled local pair.
4. If you implement that pair, keep a sequential control, run both over the same inputs, and compare end-to-end p95 and task success rather than just the tool spans.

**Deliverable:** a measured local timing table, a waterfall that labels measured spans separately from the analytical worked example, and a release rule that includes task quality. A code change and before/after comparison are optional extensions; the starter does not provide a latency optimization to benchmark.

## Failure review

- A strong median can hide a long tail dominated by one tool.
- Parallelizing dependent operations can make results incorrect.
- Shorter answers are not always better if they omit required evidence.
- A retry that ignores the remaining deadline can turn a recoverable delay into a timeout.

## Recall

- Which span determines the critical path in your trace?
- When is parallel execution valid?
- How will you detect a latency improvement that harms answer quality?

## Sources

- [OpenAI latency optimization guide](https://developers.openai.com/api/docs/guides/latency-optimization)
- [Chip Huyen: Building LLM applications for production](https://huyenchip.com/2023/04/11/llm-engineering.html)

## Try the simulation

In the **`production-tabletop`** latency waterfall, compare the sequential baseline with the parallel candidate. The starting schedule uses the chapter's independent-tool assumption; switch on **Tool B depends on Tool A** and confirm the candidate no longer claims a speedup. Treat both timelines as analytical pre-generation estimates. Use the local timing probe below for observed fixture latency and keep its measurements separate from this example.

## Course project — milestone 5 — Reliability

**Task:** Measure local fixture-query latency, not provider or network latency. The numbers vary by machine.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python - <<'PY'
import time
import math
from document_intelligence import DocumentIntelligence, load_documents
app = DocumentIntelligence(load_documents())
samples = []
for _ in range(50):
    start = time.perf_counter()
    answer = app.answer("How can the previous index roll back?")
    assert answer.status == "answered", answer.status
    assert any(span.document_id == "ops-02" for span in answer.source_spans), answer.source_spans
    samples.append((time.perf_counter() - start) * 1000)
samples.sort()
nearest_rank = lambda percentile: samples[math.ceil(percentile * len(samples)) - 1]
print(f"runs={len(samples)} p50_ms={nearest_rank(.50):.3f} p95_ms={nearest_rank(.95):.3f}")
PY
python -m unittest discover -s tests -p 'test_course_project.py' -k 'fixture_question' -v
```

**Expected result:** Tests pass; the probe prints 50 local runs with machine-dependent p50/p95, not service SLO evidence.

**Acceptance check:** Label the measured local path and do not extrapolate to deployed-model latency.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
