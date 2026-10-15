# Chapter 07 — Model Selection, Routing, and Cascades

*Use the cheapest capable model, not one model for everything*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 07.*

## Learning outcomes

- Define task slices for model comparison.
- Compare always-cheap, always-strong, and routed strategies.
- Account for routing mistakes, escalation, latency, and cost.

## Before you begin

Chapters 1–6; a fixed evaluation set and basic cost/latency measurements.

## Why this matters

Production workloads contain a distribution of task difficulty. Routing can reserve more capable or expensive models for requests that need them.

## Visual model

> **Source figure description retained:** Router chooses a candidate model; validation or low-confidence signals can trigger a bounded escalation path, while loops are prevented.

**Authored instructional mechanism map — bounded model cascade.** This is a proposed router flow from this chapter, not an implementation the course supplies.

| Current state | Check or action | Next state |
|---|---|---|
| Task arrives | Compare features with evaluated task slices | Select a candidate route within the request budget |
| Candidate returns | Validate the response against the application contract | Accepted → return; rejected → inspect escalation eligibility |
| Rejected on a cheaper route | Enough budget remains and stronger route is different | Call the stronger route at most once |
| Rejected on strongest route | No stronger eligible destination exists | Return `validation_failed_on_strongest_route` |
| Escalated result returns | Validate the new candidate | Accepted → return; rejected → `validation_failed_after_escalation` |

**Follow the cost path:** initial call + escalation + validation all count toward the same task's latency and cost. The chapter's hypothetical `70%` simple-FAQ mix suggests where routing might help; it is not proof that a router selects those requests correctly. The browser's complexity slider routes at fixed thresholds — small below 30, balanced from 30 to 69, reasoning at 70 and above — so moving it shows where one request lands; it does not measure relative model capability.

## Try the simulation

Open lesson `ai-07`, choose each **Task fixture**, and predict the route before adjusting **Minimum confidence**. Observe when low confidence changes the route to `not found`, then compare the illustrative latency and cost values for each route. The estimates are toy profiles, not provider benchmarks or recommendations.

## Concepts to retain

### Capability fit

Choose models by application evaluations, not broad benchmark rank alone.

### Router

Predict the least costly model likely to satisfy a task.

### Escalation

Try a stronger model when an explicit signal such as failed validation warrants it.

## How it works

1. Define task slices.
2. Benchmark candidate models on each slice.
3. Estimate cost and latency per model.
4. Design routing signals.
5. Evaluate end-to-end utility, including routing mistakes.

## Worked example

If 70% of support questions are simple FAQs, a less costly model may handle those while a stronger model handles policy ambiguity and tool-heavy cases. Savings only matter if router errors do not create retries or quality failures.

## Implementation sketch (pseudocode)

```ts
const candidate = router(taskFeatures);
const result = await candidate.run(request);
if (validate(result)) return result;

// A request already routed to the strongest model has nowhere to escalate.
if (candidate === strongerModel) {
  return explicitFailure("validation_failed_on_strongest_route");
}

// At most one escalation to a different model; never route in a loop.
const retry = await strongerModel.run(request);
if (validate(retry)) return retry;
return explicitFailure("validation_failed_after_escalation");
```

This is pseudocode; `router`, `validate`, `strongerModel`, and `explicitFailure` are application-defined. The course does not supply a router; you design and test one in your own project.

## What to measure

- Task success by slice and route.
- p95 latency including escalation.
- Cost per successful task.
- Escalation and fallback-loop rates.

## Failure modes to reason about

- Routing solely on prompt length.
- Ignoring model differences in tool or JSON reliability.
- Allowing fallback loops between providers.
- Optimizing cost while increasing verification burden.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Create a small local table of task slices, candidate quality, latency, and cost values.
- Compare always-cheap, always-strong, and one-rule routed decisions against the same rows.
- Add one bounded escalation after a simulated validation failure and record a terminal failure if validation still fails.
- Treat all values as synthetic inputs; do not infer current provider pricing or capability.

## Course project — milestone 1: Model boundary

**Task:** In your own TypeScript project, add a bounded fallback around the model boundary. Define two routes, a cheaper one and a stronger one, each backed by a stub that returns a scripted result and counts its calls. Write a function that runs the cheaper route, validates the result against your answer contract, and escalates to the stronger route at most once. It should return the explicit failure codes `validation_failed_on_strongest_route` or `validation_failed_after_escalation` when validation still fails. Write Vitest or `node --test` tests for three cases. First, the cheaper stub returns invalid output and the stronger returns valid output: assert the valid result is returned and the stronger stub was called exactly once. Second, both stubs return invalid output: assert the failure code and that neither stub was called again. Third, a request routed straight to the strongest route fails with the first code and makes no escalation call.

**Acceptance check:** You can point to the line that bounds escalation and to the test that would fail if a retry loop were introduced. Your notes say the routes are stubs with synthetic behavior, so the tests show the control flow is bounded, not that routing saves cost or preserves quality. No provider call is needed.

### Recall without notes

- Which evidence should justify routing?
- How can escalation erase apparent cost savings?
- Why should fallback be bounded?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Chip Huyen — Predictive Human Preference: From Model Ranking to Model Routing](https://huyenchip.com/2024/02/28/predictive-human-preference.html)
- [OpenAI — Model guidance](https://developers.openai.com/api/docs/guides/latest-model)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
