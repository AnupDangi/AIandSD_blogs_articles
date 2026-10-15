# Chapter 30 — Canary releases and AI regression gates

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 30*

## Learning outcomes

Define a known-good control and a candidate, combine offline regression tests with progressive exposure, and set rollback thresholds before inspecting candidate results.

**Prerequisite:** Chapters 22 and 25–29, evaluations, traces, and operational budgets.

## Figure walkthrough

The general release pattern is that control and candidate pass offline gates first, then a stable small cohort receives the candidate. A local exercise in your own project can run only synthetic offline comparisons; it has no deployment, traffic routing, or live canary.

**Authored instructional mechanism map — predeclared release gates.** This table connects the source release pattern with the separately labeled local offline exercise.

| Stage | Required evidence | Branch |
|---|---|---|
| Freeze control + candidate | Versioned prompt/model/policy and compatible stored state | Retain the control as a rollback target |
| Apply offline gates | Same reviewed cases and predeclared critical-slice criteria | Reject on any critical regression, even if aggregate improves |
| Expose stable small cohort | Actual traffic routing and cohort identity | Compare live quality, latency, errors, cost, and safety |
| Promote or roll back | Signals remain within the agreed limits | Expand exposure or restore the compatible control |

**Local gate worksheet:** a toy control suite scoring `5/6` citation coverage with `safety = 1.0` passes the example gate (`coverage ≥ 0.80` and `safety ≥ 1.0`). An injected expected-source failure on the safety case would yield `4/6` and `safety = 0.0`, so the same gate rejects it. This is arithmetic for a toy suite and tests gate behavior against modified case expectations, not a deployed candidate or live canary. The source's overall `+3`/upload `−17` percentage-point example illustrates why slice gates precede rollout.

## Release progressively

An offline eval suite protects against known failures, but cannot predict every production behavior. Keep a **control** (known-good prompt, model, and policy) and compare it with a **candidate**. Where possible, begin with offline tests or a shadow/dark launch, then expose a small stable cohort. Compare quality, latency, cost, and safety signals. Promote only if predeclared release gates pass; otherwise roll back.

Use a stable cohort assignment so the same user or session does not unpredictably alternate behavior. Confirm that state written by the candidate remains compatible with the control so rollback is possible. Evaluate slices, not only aggregate scores.

## Worked example

The source example describes a model upgrade that raises overall success by 3 points but lowers uploaded-document accuracy by 17 points (95% → 78%). A slice-level gate should block promotion even though the aggregate improves. The gate must be set before seeing the candidate result.

## Practice lab

1. In your own project, keep a small suite of six offline cases across five slices (one of them `safety`) and save its unmodified output as the control. A known failing case may stay in the control baseline.
2. Predeclare a critical-slice rule: any `safety` score below `1.0` halts this synthetic candidate. State separately which latency, cost, and error-rate measurements would be required for a live release; an offline suite emits none.
3. Make a temporary copy of the case file and change the `safety` case's expected source to a deliberately absent ID. Run the suite on that copy from a small script or test, leaving the original case file untouched. This is an injected failing case, not a model change.
4. Compare the control and injected results. Confirm the `safety` slice and aggregate changed, and that the predeclared rule rejects the candidate even if other slices stay green.
5. Explain how a real rollout would use a stable cohort, observe the same signals, and restore the control. No traffic routing or rollback is exercised by this offline test.

**Worked arithmetic for a toy suite:** if five of six cases pass (about `0.833`) and `safety` is `1.0`, the example gate accepts the control. Replacing only the safety case's expected ID with an absent ID would make that case fail, giving `4/6` (about `0.667`) overall and `0.0` for `safety`, so the gate rejects it. Predict these numbers for your own suite before running it, and report what you actually observe. This deliberately injects a failed expectation; it does not show that a model or application change caused a real regression.

**Deliverable:** predeclared local gate, control and injected-case outputs, release decision, and a proposed rollout/rollback procedure.

## Failure review

- A single benchmark is not evidence for a full rollout.
- Random per-request cohorts make one user experience inconsistent behavior.
- Candidate-written state can block rollback if compatibility was ignored.
- Changing thresholds after seeing results invalidates the gate.

## Recall

- Which metrics can block promotion even when task success rises?
- Why use a stable cohort?
- What state compatibility must be checked before rollout?

## Sources

- [Martin Fowler: Feature toggles](https://martinfowler.com/articles/feature-toggles.html)
- [OpenAI production best practices](https://developers.openai.com/api/docs/guides/production-best-practices)

## Try the simulation

Use the **`production-tabletop`** trace to compare **Gate on aggregate success only**, **Require aggregate and every risk slice to pass**, and **Rollback on any failed risk slice**. Before stepping, predict the action for a 96% aggregate and a 70% risk slice against 90% and 85% thresholds. Advance one check at a time and observe whether traffic is promoted, held, or rolled back. This is a proposed control flow; the local offline comparison is not a live canary or proof of production safety.

## Course project — milestone 5 — Reliability

**Task:** In your own TypeScript project, add a release gate function that takes an evaluation report (overall pass rate and per-slice pass rates) and returns accept or reject with a reason. Predeclare the rule before you look at results, for example overall coverage at least 0.80 and `safety` at least 1.0. Keep your normal case file as the control. Make an injected copy in which the `safety` case's expected source is a deliberately absent ID, and run both through the suite. Write a Vitest or `node:test` test that asserts the gate accepts the control report, rejects the injected report, names the `safety` slice in the rejection reason, and still rejects when every other slice is perfect. Add one more test that the gate rejects a report with a missing `safety` slice rather than treating it as passing. There is no traffic router, live cohort, or canary deployment here; do not call offline results a live-user canary.

**Acceptance check:** Save both reports, show that the critical-slice gate rejects the injected case, and state that live canary evidence needs a deployed cohort and a rollback path.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
