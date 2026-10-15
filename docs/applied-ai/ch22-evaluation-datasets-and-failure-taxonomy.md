# Chapter 22 — Evaluation datasets and failure taxonomy

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 22*

## Learning outcomes

Turn observed product failures into a small, representative evaluation suite; classify failures so they lead to actionable changes; and report quality by meaningful slices.

**Prerequisite:** A working AI workflow and a way to inspect representative traces.

## Figure walkthrough

The evaluation loop starts with observed failures, groups them into a taxonomy, turns representative cases into a fixed suite, compares system versions, then feeds reviewed production failures back into the suite.

**Authored instructional mechanism map — failure to evaluation case.** This is a review workflow; the source's percentage example is illustrative rather than a measured course result.

| Transition | Artifact carried forward | Guardrail |
|---|---|---|
| Observe a failed user run | Safe trace, task type, and expected outcome | Remove sensitive material and keep provenance |
| Classify the failure | Taxonomy label such as retrieval miss or invalid action | Choose a category that suggests a concrete intervention |
| Create a regression case | Stable case ID, input, reviewed expected evidence, grader version | Freeze the expected result before comparing candidates |
| Compare incumbent/candidate | Aggregate and slice-level scores on identical cases | Keep tuning cases distinct from untouched evaluation evidence |
| Review production behavior | Newly reviewed failures and coverage gaps | Version additions rather than silently changing old labels |

**Slice alarm:** overall `91% → 94%` can coexist with uploaded-document `95% → 78%`; inspect that slice before release. A small hand-built suite of about six cases in your own project would instead report per-case pass or fail, may include one labeled known failure, and cannot establish broad product accuracy.

## Build from observed behavior

An eval suite should reflect what the application is asked to do and how it fails. Begin with manual error analysis rather than a large abstract rubric. Group failures into categories, select core tasks, preserve important past failures as regression cases, and define graders and success thresholds. Add new production failures back into the suite after suitable review.

Keep distinct datasets or labels for core tasks, regressions, and edge cases. Prevent examples used to tune prompts or policies from silently becoming the only evidence used to measure those changes. Report slices—such as task type or input format—because a better overall score can hide a serious subgroup regression.

## Worked example

The source example shows overall success improving from 91% to 94% while document-upload questions fall from 95% to 78%. The aggregate is better, but users relying on uploaded documents receive a worse product. A slice-level report makes this visible before release.

## Practice lab

1. In your own project, write about six evaluation cases. For each, record a stable ID, the input or query, the expected source or outcome, and a slice label (for example retrieval, safety, or formatting). Include at least one case your system is already known to get wrong.
2. Run the suite and record the baseline pass rate overall and per slice. If the check is whether the expected source was cited, this is citation coverage, not answer correctness or model quality.
3. Copy the cases into `core.jsonl`, `regressions.jsonl`, and `edge_cases.jsonl` as appropriate, adding stable case IDs and a stated pass criterion. Add one new regression case with its reviewed expected source; keep the original six cases unchanged.
4. Run the incumbent and a candidate retrieval configuration on the same frozen cases. Your suite includes at least one known failure; a configuration change may leave it unchanged. Report the observed result honestly rather than editing expected labels to force a delta.
5. Report both aggregate and slice deltas, including the tiny sample size. Expand toward 100 reviewed real traces when such traces exist; the course does not supply them.

**Deliverable:** a versioned eval manifest, failure taxonomy, and candidate-versus-incumbent report.

## Failure review

- A large rubric written before looking at errors can measure the wrong things.
- One average hides critical slices.
- Tuning on the evaluation set weakens the value of the reported result.
- An old suite stops representing the product when behavior and users change.

## Recall

- Which case sets are used for core behavior, regressions, and edge cases?
- Which slice could regress while the aggregate improves?
- What evidence keeps tuning examples separate from final evaluation?

## Sources

- [Hamel Husain: Evals in production](https://hamel.dev/notes/llm/ai-product-engineering/evals-production.html)
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## Try the simulation

In the **`evaluation-console`**, predict which of its four fixed slices will fail when you raise the acceptance threshold from 0.72 to 0.80, then move the slider and inspect the rows. The console has no `ops-02` case or candidate comparison; build those in your own suite.

## Course project — milestone 4 — Evaluation

**Task:** In your own TypeScript project, add an evaluation module and a case file (for example `evals/cases.json`) with about six cases. Give each case a stable ID, an input, an expected source or outcome, and a slice label. Include one case your system is known to get wrong. Write a Vitest or `node:test` test that loads the cases, runs them through your application with its model or retrieval step stubbed or deterministic, and asserts the per-case result and the per-slice pass rate. Then describe a case change that should lower a slice score, change the case, and confirm the assertion on that slice fails.

**Acceptance check:** Record the baseline overall and per-slice pass rates from your own suite, and identify which case and slice account for any failure. Do not claim broad product quality: a handful of cases measures only what those cases check.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
