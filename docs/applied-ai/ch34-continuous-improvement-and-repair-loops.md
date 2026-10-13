# Chapter 34 — Continuous improvement and repair loops

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 34*

**Measured improvement, not uncontrolled self-modification.**

## Learning outcomes

Turn representative production failures into regression cases, compare a candidate against an incumbent with an external validator, and release a change only when its measured gains justify its costs and risks.

**Prerequisite:** Chapters 22–24, eval design, judge calibration, and trajectory evaluation.

## Figure walkthrough

Reviewed traces produce eval cases; proposed changes run against those cases and the incumbent; only a passing candidate reaches a canary, with the incumbent retained for rollback.

**Authored instructional mechanism map — bounded repair with an incumbent.** This map uses the chapter's proposed source-span regression and keeps release authority outside the proposing agent.

| Transition | Evidence to keep | Stop/accept rule |
|---|---|---|
| Observe/classify | Failed trace and stable regression case ID | Verify the failure is representative and reproducible |
| Specify invariant | Span width covers eight characters but stored text has five | Reject inconsistent `end_char − start_char != len(text)` |
| Propose candidate | Reviewed validation change and candidate version | Any generate/test/repair helper is bounded to three attempts |
| Run same checks | Incumbent failure, candidate result, existing suite, untouched holdout | Do not edit labels or gates to conceal a regression |
| Decide release | Quality evidence plus required cost/latency/safety checks | Passing a new unit test alone does not authorize production deployment |
| Canary/monitor | Compatible retained incumbent and rollback procedure | Restore incumbent if live signals violate gates |

**Loop boundary:** a failed candidate can return to the proposal step only while its repair budget remains. The agent can suggest a change; the external validator and release policy decide whether it is accepted. The course fixture does not automatically repair, canary, or deploy anything.

## Close the loop safely

The improvement loop is **observe → evaluate → propose → test → release**. Collect representative traces, classify capability-specific failures, and use them to propose changes to prompts, tools, or control flow. Run regressions and cost/latency tests before release. Keep the incumbent available as the comparison and rollback target.

Use a reliable external validator where possible, especially for code or structured tasks. An agent may propose a repair, but it must not rewrite its own prompt and deploy the change without evaluation and release controls. Synthetic gains need production evidence; canary the candidate and keep monitoring after it ships.

## Worked example

A coding agent repeatedly fails database migrations. Turn representative failed traces into regression tasks, then change the tool instructions or validator. Compare the candidate harness with the incumbent. Ship only if it improves migration pass rate without unacceptable cost or latency regressions.

## Practice lab

1. Run the six-case `fixtures/evaluation.json` as the incumbent baseline and record the overall and per-module results, including the labeled retrieval failure. Before iterating, author one new fixture case plus its expected source; treat it as your holdout and leave it untouched throughout.
2. Inspect the existing inconsistent-span regression: its offsets cover eight characters while its text contains five. The current `Answer.validate` already rejects it. Compare that validator with the explicitly authored weak span-check comparator below, which omits the width invariant; this is a teaching baseline, not a retained historical production release.
3. Explain the change needed to the weak comparator: require `end_char - start_char == len(text)` while retaining the other checks. The starter already includes this repair and its regression; do not weaken the real validator to reproduce the bug. Limit any future generate → test → repair helper to three attempts and persist case IDs, candidate version, and results.
4. Run the same malformed/corrected span inputs against the comparator and current validator. The malformed case must change from accepted to rejected, while the corrected case stays valid. Keep the six-case fixture report stable, including its known retrieval failure; report any new failure rather than editing the gate.
5. Record which costs, latency, and live traffic evidence are unavailable from the deterministic starter.

**Deliverable:** traces for each repair attempt and a candidate-versus-incumbent evaluation report.

## Failure review

- Immediate self-deployment removes independent validation.
- A validator weaker than the generator can accept plausible but incorrect output.
- Synthetic improvement may not transfer to production traffic.
- Without a retained incumbent, rollback has no known-good target.

## Recall

- Which stage can propose a change, and which stage authorizes release?
- How do you prevent repair from becoming an unbounded loop?
- What evidence is needed before replacing the incumbent?

## Source

- [OpenAI: Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals) — trace-based grading concepts. The starter's Chapter 24 replay grades deterministic authored trajectories; it does not run a model or automatically promote candidates.

## Try the simulation

Use the **`evaluation-console`** and compare the **Incumbent** with the **Candidate**. Predict whether the higher aggregate should promote the candidate, then inspect the **Uploaded documents** slice against its floor. Toggle **Ignore slice gates** to expose how aggregate-only promotion hides a critical regression. This is a deterministic fixture; use the local incumbent/candidate report for the actual repair decision.

## Course project — milestone 6 — Trust boundaries

**Task:** Use fixture `ops-03` and inspect `Answer.validate` in `document_intelligence/models.py`. Run the retained outside-allowlist and inconsistent-span-width regressions. Compare the authored weak comparator with the current validator below, then add one new malformed-evidence case of your own and record whether the current contract catches it. This exercise demonstrates a controlled validator comparison; the starter does not automatically repair or promote changes.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m document_intelligence --evaluate
python - <<'PY'
from document_intelligence.models import Answer, SourceSpan

def weak_span_check(span):
    return span.start_char >= 0 and span.end_char > span.start_char and bool(span.span_id)

def current_accepts(span):
    try:
        Answer("answered", "claim", ("ops-03",), "repair-demo", (span,)).validate({"ops-03"})
        return True
    except ValueError:
        return False

bad = SourceSpan("ops-03", "ops-03:0-8", 0, 8, "short", 1.0)
fixed = SourceSpan("ops-03", "ops-03:0-5", 0, 5, "short", 1.0)
print(f"authored_weak_accepts_bad={weak_span_check(bad)} current_accepts_bad={current_accepts(bad)}")
print(f"current_accepts_corrected={current_accepts(fixed)}")
assert weak_span_check(bad) and not current_accepts(bad) and current_accepts(fixed)
PY
python -m unittest discover -s tests -p 'test_course_project.py' -k 'answer_contract' -v
python -m unittest discover -s tests -p 'test_course_project.py' -k 'evaluation_reports' -v
```

**Expected result:** Evaluation reports six fixture cases and the labeled retrieval failure. The comparator prints `authored_weak_accepts_bad=True current_accepts_bad=False` and `current_accepts_corrected=True`; the retained focused regressions pass. The current validator's shape checks do not prove that a span's text really comes from the original source or that it supports a free-form claim; keep those separate evidence checks in your design.

**Acceptance check:** Keep the failing case and repair decision traceable, and do not claim automatic repair or release.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
