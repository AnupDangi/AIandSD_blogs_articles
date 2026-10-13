# Chapter 30 — Canary releases and AI regression gates

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 30*

## Learning outcomes

Define a known-good control and a candidate, combine offline regression tests with progressive exposure, and set rollback thresholds before inspecting candidate results.

**Prerequisite:** Chapters 22 and 25–29, evaluations, traces, and operational budgets.

## Figure walkthrough

The general release pattern is that control and candidate pass offline gates first, then a stable small cohort receives the candidate. The repository starter can exercise only synthetic local fixture comparisons; it has no deployment, traffic routing, or live canary.

**Authored instructional mechanism map — predeclared release gates.** This table connects the source release pattern with the separately labeled local fixture exercise.

| Stage | Required evidence | Branch |
|---|---|---|
| Freeze control + candidate | Versioned prompt/model/policy and compatible stored state | Retain the control as a rollback target |
| Apply offline gates | Same reviewed cases and predeclared critical-slice criteria | Reject on any critical regression, even if aggregate improves |
| Expose stable small cohort | Actual traffic routing and cohort identity | Compare live quality, latency, errors, cost, and safety |
| Promote or roll back | Signals remain within the agreed limits | Expand exposure or restore the compatible control |

**Local gate worksheet:** control fixture `5/6` citation coverage and `safety = 1.0` passes the example gate (`coverage ≥ 0.80` and `safety ≥ 1.0`). Injected expected-source failure yields `4/6` and `safety = 0.0`, so the same gate rejects it. This tests gate behavior against modified fixture expectations, not a deployed candidate or live canary. The source's overall `+3`/upload `−17` percentage-point example illustrates why slice gates precede rollout.

## Release progressively

An offline eval suite protects against known failures, but cannot predict every production behavior. Keep a **control** (known-good prompt, model, and policy) and compare it with a **candidate**. Where possible, begin with offline tests or a shadow/dark launch, then expose a small stable cohort. Compare quality, latency, cost, and safety signals. Promote only if predeclared release gates pass; otherwise roll back.

Use a stable cohort assignment so the same user or session does not unpredictably alternate behavior. Confirm that state written by the candidate remains compatible with the control so rollback is possible. Evaluate slices, not only aggregate scores.

## Worked example

The source example describes a model upgrade that raises overall success by 3 points but lowers uploaded-document accuracy by 17 points (95% → 78%). A slice-level gate should block promotion even though the aggregate improves. The gate must be set before seeing the candidate result.

## Practice lab

1. Save the unmodified output of `python -m document_intelligence --evaluate` as the control. It reports six fixture cases and citation coverage across five slices; the known retrieval paraphrase miss is part of the control baseline.
2. Predeclare a critical-slice rule: any `safety` score below `1.0` halts this synthetic candidate. State separately which latency, cost, and error-rate measurements would be required for a live release; the starter emits none.
3. In a temporary copy of `fixtures/evaluation.json`, change the `safety` case's `expected_source` to a deliberately absent ID. Call `evaluate(path)` on that copy from a small local script or test, leaving the checked-in fixture untouched. This is an injected failing fixture, not a model change.
4. Compare the control and injected result. Confirm the `safety` slice and aggregate changed, and that the predeclared rule rejects the candidate even if other slices stay green.
5. Explain how a real rollout would use a stable cohort, observe the same signals, and restore the control. No traffic routing or rollback is exercised by this fixture test.

**Expected local observation:** the unmodified fixture scores `5/6` (about `0.833`) overall, `0.5` for `retrieval`, and `1.0` for `safety` and the other three slices. Replacing only the safety case's expected ID with an absent ID yields `4/6` (about `0.667`) overall, `0.0` for `safety`, and leaves retrieval at `0.5` with the other three slices at `1.0`. This deliberately injects a failed expectation; it does not show that a model or application change caused a real regression.

**Deliverable:** predeclared local gate, control and injected-fixture outputs, release decision, and a proposed rollout/rollback procedure.

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

Use the **`production-tabletop`** trace to compare **Gate on aggregate success only**, **Require aggregate and every risk slice to pass**, and **Rollback on any failed risk slice**. Before stepping, predict the action for a 96% aggregate and a 70% risk slice against 90% and 85% thresholds. Advance one check at a time and observe whether traffic is promoted, held, or rolled back. This is a proposed control flow; the local fixture comparison is not a live canary or proof of production safety.

## Course project — milestone 5 — Reliability

**Task:** Use the `evaluate(path)` seam in `document_intelligence/evaluation.py` for the injected-fixture comparison above. Keep the repository fixture as the control. There is no traffic router, live cohort, or canary deployment here; do not call fixture results a live-user canary.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python - <<'PY'
import json
import tempfile
from pathlib import Path

from document_intelligence.evaluation import evaluate

cases = json.loads(Path("fixtures/evaluation.json").read_text(encoding="utf-8"))
for case in cases:
    if case["module"] == "safety":
        case["expected_source"] = "absent-source"
with tempfile.TemporaryDirectory() as directory:
    injected = Path(directory) / "injected.json"
    injected.write_text(json.dumps(cases), encoding="utf-8")
    control = evaluate()
    candidate = evaluate(injected)
    def gate(result):
        return (result["citation_coverage"] >= 0.80
                and result["slices"].get("safety", 0.0) >= 1.0)
    print(json.dumps({
        "control": {"report": control, "release": "accept" if gate(control) else "reject"},
        "injected_fixture": {"report": candidate, "release": "accept" if gate(candidate) else "reject"},
    }, indent=2))
PY
```

**Expected result:** Both reports contain six cases. The control has `5/6` citation coverage and `safety: 1.0`, so this illustrative gate accepts it. The injected fixture has `4/6` coverage and `safety: 0.0`, so the gate rejects it. The injected data changes only the expected source; it tests the evaluation gate, not application behavior or a live canary.

**Acceptance check:** Save both outputs, show the critical-slice gate rejects the injected case, and state that live canary evidence needs a deployed cohort and rollback path.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
