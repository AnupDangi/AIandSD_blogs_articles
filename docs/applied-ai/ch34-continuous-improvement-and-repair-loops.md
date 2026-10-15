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

**Loop boundary:** a failed candidate can return to the proposal step only while its repair budget remains. The agent can suggest a change; the external validator and release policy decide whether it is accepted. Nothing in this map repairs, canaries, or deploys automatically.

## Close the loop safely

The improvement loop is **observe → evaluate → propose → test → release**. Collect representative traces, classify capability-specific failures, and use them to propose changes to prompts, tools, or control flow. Run regressions and cost/latency tests before release. Keep the incumbent available as the comparison and rollback target.

Use a reliable external validator where possible, especially for code or structured tasks. An agent may propose a repair, but it must not rewrite its own prompt and deploy the change without evaluation and release controls. Synthetic gains need production evidence; canary the candidate and keep monitoring after it ships.

## Worked example

A coding agent repeatedly fails database migrations. Turn representative failed traces into regression tasks, then change the tool instructions or validator. Compare the candidate harness with the incumbent. Ship only if it improves migration pass rate without unacceptable cost or latency regressions.

## Practice lab

1. Write a small set of eval cases for a toy answer validator, each with a stable case ID, an input, and an expected accept or reject result. Treat the set as the incumbent baseline and record its results. Author one extra case as your holdout and leave it untouched throughout.
2. Write the chapter's inconsistent-span regression as a case: offsets cover eight characters while the stored text has five. Compare an explicitly authored weak span check (valid ID, non-negative start, end greater than start) with a stricter validator. This is a teaching baseline, not a retained historical release.
3. Explain the change needed to the weak check: require `end_char - start_char == len(text)` while retaining the other checks. Do not weaken the stricter validator to reproduce the bug. Limit any future generate → test → repair helper to three attempts and persist case IDs, candidate version, and results.
4. Run the same malformed and corrected span inputs against both checks. The malformed case must change from accepted to rejected, while the corrected case stays valid. Keep the baseline report stable, including any known failure; report any new failure rather than editing the gate.
5. Record which cost, latency, and live traffic evidence you do not have from this deterministic exercise.

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

- [OpenAI: Evaluate agent workflows](https://developers.openai.com/api/docs/guides/agent-evals) — trace-based grading concepts. Grading authored trajectories in a deterministic replay does not run a model or automatically promote candidates.

## Try the simulation

Use the **`evaluation-console`** and compare the **Incumbent** with the **Candidate**. Predict whether the higher aggregate should promote the candidate, then inspect the **Uploaded documents** slice against its floor. Toggle **Ignore slice gates** to expose how aggregate-only promotion hides a critical regression. This is a deterministic scenario; use your own incumbent/candidate comparison for the actual repair decision.

## Course project — milestone 6 — Trust boundaries

**Task:** In your own TypeScript project, add a validator for the evidence your answers carry (source ID in the allowed set, span offsets inside the source, and span width equal to the stored text length). Write a Vitest or `node:test` regression test for each rule, including the eight-versus-five width case. Then write a small comparison test: keep a deliberately weak span check as a test-local helper that omits the width rule, run the same malformed and corrected spans through both checks, and assert that the weak check accepts the malformed span while your real validator rejects it and still accepts the corrected one. Finally add one new malformed-evidence case of your own and record whether your validator catches it. This is a controlled validator comparison; nothing in it repairs or promotes changes automatically.

**Acceptance check:** Keep the failing case and the repair decision traceable (case ID, candidate version, result), and do not claim automatic repair or release. Shape checks do not prove that a span's text really comes from the original source or that it supports a free-form claim; keep those as separate evidence checks in your design.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
