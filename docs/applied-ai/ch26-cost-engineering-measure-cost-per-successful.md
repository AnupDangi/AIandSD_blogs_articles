# Chapter 26 — Cost engineering

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 26*

## Learning outcomes

Measure cost at the run and successful-task levels, attribute retries and optional components to the originating task, and use controlled ablations to judge marginal value.

**Prerequisite:** Chapters 22 and 25, evaluation datasets and correlated traces.

## Figure walkthrough

Model calls, retries, tools, and infrastructure contribute to total run cost. Divide that spend by successful tasks to compare cost per success, then use controlled ablations to test the added value of a component.

**Authored instructional mechanism map — spending to successful outcomes.** The arithmetic uses the chapter's hypothetical system comparison, assuming the stated averages apply to the same task population.

| View | System A | System B | What it answers |
|---|---|---|---|
| Average cost/run | `$0.04` | `$0.06` | How much does an attempt cost, including failed attempts? |
| Task success fraction | `0.70` | `0.95` | How many attempts meet the same success criterion? |
| Expected cost/success | `$0.04 / 0.70 ≈ $0.057` | `$0.06 / 0.95 ≈ $0.063` | How much total spend supports one successful task? |
| Decision context | Lower cost/success here | Higher success rate here | Product value and risk still determine whether the difference is worthwhile |

**Ledger path:** originating task → all model calls + retries + tools + attributed infrastructure → total spend → divide by successful tasks. A failed run remains in the spend numerator. Compare optional components with controlled ablations on the same cases; the local starter has no billed provider usage.

## Measure value, not just tokens

Per-token pricing is only one part of an agent’s cost. Runs may include repeated model calls, tool loops, retrieved context, retries, routing choices, and infrastructure. Track the cost of the full run and divide total spend by successfully completed tasks. This makes failure spend visible and supports comparisons between systems with different success rates.

The source distinguishes **cost/run**, **cost/success**, and **marginal value**. Attribute calls and retries to the originating run, then report results by task slice. An expensive component is justified only if the measured outcome improvement is worth its added cost for that workload.

## Worked example

System A costs $0.04 per run and succeeds 70% of the time: $0.04 / 0.70 ≈ $0.057 per successful task. System B costs $0.06 per run and succeeds 95% of the time: $0.06 / 0.95 ≈ $0.063. B costs more per success in this simple calculation, but its additional product value may still justify the difference. The calculation informs the decision; it does not decide product value alone.

## Practice lab

1. Run the six checked-in evaluation cases and record observed citation coverage by slice. This set cannot estimate broad product success.
2. Create a clearly labeled hypothetical cost ledger for the six runs, including one failed attempt and one retry. Calculate total spend, cost/run, and cost per passing fixture case; these are toy charges, not provider billing.
3. Compare two candidate ledgers with different pass counts and costs over the same six cases. If you later add a real provider, replace the toy charges with measured billed usage and expand to a representative benchmark.
4. Build a Pareto table for fixture pass rate, local latency, and hypothetical spend. Do not claim an optional verifier was removed from the starter: it has none.

**Deliverable:** a reproducible toy cost report and a conditional decision about whether a proposed optional component would earn its cost. State what measured billing and outcome evidence a real decision would require.

## Failure review

- Lower average token spend can be offset by more retries or lower success.
- Failed runs still consume resources; omitting them biases cost/success.
- A premium model used for a deterministic step may have no measurable marginal value.
- Per-task or per-user budgets may be necessary to contain outliers.

## Recall

- How do cost/run and cost/success differ?
- Which failed runs must be included in your numerator?
- What quality measure might change when a component is removed?

## Sources

- [Chip Huyen: Building LLM applications for production](https://huyenchip.com/2023/04/11/llm-engineering.html)
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing) — verify current rates before using them in a decision.

## Try the simulation

Use the **`evaluation-console`** to compare the small, balanced, and reasoning route profiles. Record total fixture cost, successful tasks, and cost per success for each. Values are invented accounting examples, not provider prices; the task below still requires you to mark the starter’s actual billing as unavailable.

## Course project — milestone 4 — Evaluation

**Task:** Inventory what `evaluation.py` measures. The starter has no model calls, token accounting, or billing; report local fixture outcomes and mark spend unavailable, not zero.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m document_intelligence --evaluate
```

**Expected result:** The CLI prints six local case results and citation coverage across five module slices. The baseline is 5/6 overall, with 0.5 retrieval coverage because the fixture includes a known paraphrase failure. It reports neither token usage nor currency; read `fixtures/evaluation.json` for case definitions.

**Acceptance check:** Separate observed fixture outcome from unmeasured provider cost.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
