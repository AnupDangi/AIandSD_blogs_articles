# Chapter 28 — SLOs and resource budgets for AI

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 28*

## Learning outcomes

Define a user-facing SLI and SLO, propagate one end-to-end deadline through a workflow, and stop or degrade a run when its time, cost, token, step, or tool-call budget is exhausted.

**Prerequisite:** Chapters 25–27, traces, cost, and latency.

## Figure walkthrough

One request deadline and resource budget flow through each stage. Every operation consumes from the remaining allowance; when a limit is reached, the workflow stops or selects a defined degraded response.

**Authored instructional mechanism map — one shared 20-second deadline.** This is a budget worksheet based on the chapter's product objective, not measured stage durations.

| Checkpoint | Allowance used for the next operation | Decision |
|---|---|---|
| Request starts at `t = 0` | Deadline is `t = 20 s` | Reserve time for validation/response inside that same window |
| Before retrieval | `20 s − elapsed − remaining response reserve` | Begin only if a bounded retrieval can fit |
| Before tools/generation | Recalculate from the original deadline | Never assign a fresh independent 20-second timeout |
| Before retry | Remaining time and step/tool/cost allowances | Retry only if it fits every applicable bound |
| Limit reached | No further eligible work | Stop or return the predefined degraded result with a reason |

**Parallel gates:** the deadline is only one constraint. Every operation must also fit the remaining step, tool-call, token, and simulated cost budgets. An SLO counts good user events over a stated window; a single run budget does not itself prove an SLO. Bounded attempts and a fallback are a separate mechanism from shared-deadline enforcement, and the course supplies neither.

## Set the boundary before the incident

An **SLI** is a measured user-facing signal. An **SLO** is a target for that signal over a defined window. A **run budget** limits resources such as elapsed time, cost, tokens, steps, or tool calls. Without explicit limits, a run can remain active while it misses the user’s expectation or consumes unbounded resources.

Define a good event and target from the product journey. In a system that supports a shared deadline, each operation receives only the time remaining, not a fresh full timeout. When a limit is exhausted, terminate safely or choose a known degraded path. Do not use machine utilization alone as a proxy for user success. The course supplies no shared deadline or cost ledger; a bounded retry helper limits only the attempt count and selects a fallback. **Burn rate** is the speed at which a run consumes its error budget — a burn rate above 1 exhausts the budget before the window ends.

## Worked example

Suppose the product objective is “complete a research answer within 20 seconds.” Giving retrieval, tools, generation, and retries each a separate 20-second timeout does not meet that objective. The workflow must calculate remaining time before each stage, reserve time for validation and response, and stop or degrade when the shared deadline is reached.

## Practice lab

1. Define a user-visible good event and an SLO window for a mock workflow.
2. Add `deadline` and `deadline_remaining` to a run state.
3. Add `MAX_STEPS` and a hypothetical `MAX_COST` ledger; check both before starting additional work. A local toy workflow has no billable model usage, so label cost as simulated.
4. Inject a slow dependency and a budget-exhausting run.
5. Verify that the workflow stops or degrades with an observable reason and a usable user response.

**Deliverable:** SLI/SLO definition, budget table, and traces for normal and exhausted runs.

## Failure review

- CPU utilization alone does not show whether the user journey succeeded.
- Interactive requests and background jobs can require different objectives.
- Retrying after the shared deadline is already impossible wastes resources.
- A 100% reliability target leaves no room to make an explicit error-budget decision.

## Recall

- What event counts as good from the user’s perspective?
- Why must child timeouts consume a shared deadline?
- What should the system return when a budget is exhausted?

## Sources

- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [OpenAI latency optimization guide](https://developers.openai.com/api/docs/guides/latency-optimization)

## Try the simulation

In the **`production-tabletop`** trace, compare **Run both tools sequentially**, **Run both independent tools in parallel**, and **Parallel tools with a 300 ms generation cap**. For each policy, predict whether the request meets its 800 ms budget, select the prediction, then advance one transition at a time. Compare the critical-path totals (1,230 ms, 990 ms, and 790 ms) with your prediction. These are fixed analytical examples, not measured SLOs; note that the 20-second objective worksheet above and this 800 ms tabletop budget are separate worked examples at different scales, not the same system. Use the bounded-retry exercise below to verify attempts, then define the separate good-event SLO in the practice lab.

## Course project — milestone 5 — Reliability

**Task:** In your own TypeScript project, find the retry helper that wraps your slowest or flakiest operation (write a small one with a fixed attempt limit and a fallback if you have none). Add a Vitest or `node:test` test with a fake operation that keeps throwing a timeout error. Assert that the operation is called exactly the configured number of times, that the fallback result is then returned, and that the result carries an observable reason. Then add a shared deadline and a simulated cost ledger for one request: each stage receives only the time and budget remaining, and the request stops or degrades when either is exhausted. Write a second test with a fake clock where one slow stage uses up most of the deadline, and assert that a later stage is skipped or degraded instead of getting a fresh full timeout.

**Acceptance check:** Your tests show finite attempts and the configured fallback. Label the deadline and cost ledger as your own design extension and the cost as simulated, and do not claim a live service SLO.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
