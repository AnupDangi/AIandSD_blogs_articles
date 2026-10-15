# Chapter 23 — LLM-as-judge calibration

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 23*

## Learning outcomes

Create a human-labeled reference set, measure judge errors beyond overall accuracy, and decide whether an LLM judge is suitable for a particular evaluation task.

**Prerequisite:** Chapter 22, evaluation datasets and failure taxonomy.

## Figure walkthrough

Human-labeled examples form the reference set. The judge labels the same examples; disagreements are counted as false positives and false negatives, then inspected by slice before the judge is trusted for monitoring.

**Authored instructional mechanism map — calibrate against reviewed labels.** “Positive” here means the grader flags a hallucination; it is not a label supplied by a retrieval test case.

| Human reference | Judge says hallucination | Judge says no hallucination |
|---|---|---|
| Hallucination present | True positive (TP): detected failure | False negative (FN): missed failure |
| Hallucination absent | False positive (FP): unnecessary alarm | True negative (TN): correctly clear |

**Read the metrics:** accuracy = `(TP + TN) / all cases`; hallucination recall = `TP / (TP + FN)`; positive precision = `TP / (TP + FP)`. A zero denominator makes the corresponding metric undefined, not perfect. The source's `95%` accuracy and `61%` recall illustrate why many true negatives can hide missed failures; they do not describe this course's judge performance. In the console visualization below, a **false pass** corresponds to a false negative (a failure the judge misses) and a **false reject** corresponds to a false positive (an acceptable output the judge flags).

**Calibration path:** rubric → independent reviewer labels → disagreements/adjudication → frozen reference set → judge predictions without reference labels → confusion counts and slice review → suitability decision. Keep original reviewer labels to measure agreement before adjudication. A changed judge, rubric, or input distribution requires revalidation; a six-case mock exercise cannot authorize monitoring.

## Evaluate the evaluator

An LLM judge can make repeated grading more scalable, but its score is not ground truth. First define a rubric with examples. Have domain reviewers label examples independently, resolve disagreements, and preserve the resulting labels as a reference set. Then compare the judge’s decisions against those human labels on the distribution it will actually monitor.

Use a confusion matrix to distinguish false positives from false negatives. Choose precision or recall according to the consequence of each error; do not rely on accuracy alone. Check performance on relevant slices. A judge can agree with the majority overall and still miss a failure class that matters to the product. Revalidate it when the rubric, task distribution, or judge model changes.

## Worked example

The source example describes a hallucination detector with 95% accuracy but 61% recall. It misses nearly four in ten labeled hallucinations despite the high accuracy. Whether that is acceptable depends on the product’s risk, but accuracy alone cannot support the decision.

## Practice lab

1. In your own project, pick six representative questions or tasks, run them, and save the current answers and citations. Define one narrow binary grading question, such as whether each answer's cited span supports its main claim. Six cases are a practice set, not a reliable estimate of judge performance. An `expected_source` field in an eval case is a retrieval target, not a human quality label; a known failing case is useful for discussing an error, not a pre-labeled judge result.
2. Have two reviewers label the six outputs independently using the same rubric, without showing them `expected_source`. Preserve both labels for each case. If a second reviewer is unavailable, record that limitation and leave inter-reviewer agreement unmeasured rather than inventing a second label.
3. When two label sets exist, measure raw reviewer agreement (matches / 6) before adjudication and identify every disagreement.
4. Resolve disagreements and retain the adjudicated label and reason.
5. The course supplies no judge implementation or stored judge labels. For an arithmetic exercise, make an explicitly mock set of six judge decisions after adjudication, or run a separately configured judge without exposing labels to it. Keep mock and live results distinct.
6. If you have adjudicated reference labels and judge decisions, compute confusion counts, precision, recall, and false-negative rate; inspect the cases in each error group. With no second reviewer or judge decisions, report the missing evidence instead of a calibration metric.
7. State what additional sample size, slice coverage, and review would be needed before a judge could be used for monitoring. Do not authorize a judge from this six-case exercise alone.

**Deliverable:** the rubric, original and adjudicated labels where available, a clearly marked mock or live confusion matrix where computable, a slice note, and a decision about what evidence is still required before judge use.

## Failure review

- Treating the judge score as a label hides evaluator uncertainty.
- No human agreement study makes disagreements look like model errors by default.
- A rubric misaligned with product requirements yields a precise answer to the wrong question.
- Changing the judge model without revalidation breaks comparability.

## Recall

- Which error type is most costly for your evaluation task?
- Why can a high accuracy score hide missed failures?
- What event requires the judge to be recalibrated?

## Sources

- [Hamel Husain: Evals in production](https://hamel.dev/notes/llm/ai-product-engineering/evals-production.html)
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## Try the simulation

Use the **`evaluation-console`** to change the judge confidence threshold and compare each prediction with its fixed reviewer label. Watch false passes and false rejects trade places as you raise the floor. The six cases are synthetic; raw agreement here is not a substitute for independent reviewers and adjudication in the exercise below.

## Course project — milestone 4 — Evaluation

**Task:** In your own TypeScript project, prepare a calibration exercise on six cases. Add a small module that writes the six actual outputs (answer plus citations) to a review sheet file, with one column each for reviewer A and reviewer B. Have two reviewers label each output against one rubric before sharing answers, report raw agreement (matches / 6), list disagreements, then adjudicate. If only one reviewer is available, preserve that label set and mark agreement and adjudication pending. Write a Vitest or `node:test` test for the agreement function: assert that identical label sets give 6/6, that one flipped label gives 5/6, and that it throws or returns pending when a label set is missing. A second test should assert that the confusion counts, precision, and recall computed from a small hand-made list of reference and judge labels equal values you worked out by hand.

**Acceptance check:** Preserve any original reviewer labels and the agreement calculation when two reviewers participate. A citation-coverage or pass-rate report from your eval suite is not a judge-calibration report. Do not claim judge validation or statistical reliability from six cases.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
