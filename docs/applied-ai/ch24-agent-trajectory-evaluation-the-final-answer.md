# Chapter 24 — Agent trajectory evaluation

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 24*

## Learning outcomes

Evaluate an agent’s end state separately from its final prose, define acceptable and unacceptable action sequences, and account for stochastic variation across repeated runs.

**Prerequisite:** Chapters 16–17 and 22, tool use, agent workflows, and evaluation suites.

## Figure walkthrough

Evaluate two outputs from a run separately: the environment’s final state and the recorded sequence of model decisions, tool calls, and observations. A correct final message alone does not establish either.

### Authored mechanism map — outcome and path are separate

This table maps authored, model-free index-release scenarios to the two graders. It is an authored teaching aid, not a recovered figure from the source PDF.

| Evidence flow | Grader question | Evidence to inspect |
|---|---|---|
| Initial index state → recorded tool arguments → deterministic tool replay → actual final state | Is the target index active **and** ready? | The environment's active index and the target index's readiness flag |
| Replayed tool calls → derived observations → path rules | Were tools allowed, arguments valid, checks ordered, side effects unique, and steps bounded? | The recorded trace, any rule violations, and per-action side-effect counts |
| Final answer text or a claimed tool observation | Does prose establish either result? | Neither is used for grading |

| Authored scenario | Outcome | Path | What separates them |
|---|---|---|---|
| `valid-release` | Pass | Pass | Inspect → build → verify → activate → inspect |
| `unsafe-no-verification` | Pass | Fail | The environment accepts activation, but the path skips its safety check |
| `valid-unready-outcome` | Fail | Pass | Verification finds an unready index; the run stops without activation |
| `forbidden-activation` | Fail | Fail | A tool outside the task’s allowlist is rejected and leaves the previous index active |

## Grade the path as well as the outcome

A transcript records model calls, tool calls, and observations. The outcome is the actual state in the environment. A trajectory rubric describes whether the path was acceptable: which tools were used, how arguments were formed, whether verification happened, and whether actions were duplicated or unsafe.

Capture a complete trace. Grade the objective end state independently from the agent’s answer text, then inspect tool choice and arguments. Measure steps, retries, cost, and policy violations. For stochastic workflows, repeat tasks and report pass rate and variability rather than drawing conclusions from one run.

## Worked example

A booking agent may return “reservation confirmed” after a failed write. Grading only the final message marks a false success. Outcome grading checks whether the reservation actually exists. Trajectory grading also checks whether the agent used the permitted booking tool, passed valid arguments, and avoided duplicate bookings.

## Practice lab

1. Write mock tasks as data in your own TypeScript project, starting with the four scenarios in the table above and growing toward about 20. Each task has an initial environment, target index, allowed tools, step budget, and exactly one recorded run.
2. Replay each recorded run into a small in-memory environment. Inspect each replayed tool call, arguments, derived observation, side-effect count, and final state. A task’s claimed success text or claimed observation must not change the score.
3. Compare an outcome pass flag with a trajectory pass flag for every task. The outcome checks the active, ready index; the path checks inspection before mutation, successful verification before activation, final inspection, allowed tools and arguments, target boundaries, duplicate effects, and the step budget.
4. Modify your `unsafe-no-verification` task to verify before activation and observe its path result change. Then remove readiness in `valid-release` and stop after failed verification: the path can remain valid while the objective fails. Keep task IDs unique when adding scenarios.
5. For pass@1, run each task once and report the fraction of task runs that pass. Repeating a deterministic mock will produce the same result unless you explicitly inject variation. With a stochastic model, three independent runs per task can reveal variation; report their per-run rate separately from the fraction with at least one success (pass@3).

**Deliverable:** your changed trace data, the two rubrics, and a report of outcome and trajectory errors, including the sample denominator.

**Model-free limits:** these are prerecorded actions replayed into an in-memory reference environment. No agent decides what to do, no external index is deployed, and latency, token cost, and stochastic model reliability are not measured. The toy environment deliberately permits unverified activation so the grader can demonstrate unsafe success; its replay executor is not a production permission boundary.

## Failure review

- Scoring only response text can reward a claim that the environment contradicts.
- Duplicate side effects can occur even when the final state appears correct.
- A single trial misses run-to-run variation.
- Rewarding shorter traces can discourage necessary verification.

## Recall

- How do you distinguish a transcript from the actual outcome?
- Can a run succeed while violating the trajectory rubric?
- What should a grader inspect for side-effecting tools?

## Sources

- [OpenAI agent evals guide](https://developers.openai.com/api/docs/guides/agent-evals)
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## Try the simulation

Use the **`evaluation-console`** and select **Correct answer via forbidden source**. Predict the decision if only the final answer were graded, then compare it with the action-path result. The scenario should be rejected even though its final text passes. Also inspect **Safe abstention**: an acceptable path does not turn an unanswered task into a successful final outcome.

## Course project — milestone 4 — Evaluation

**Task:** In your own TypeScript project, add a deterministic trajectory evaluator for one tool-using flow of your application (the index-release toy above is a fine stand-in if your app has no side-effecting tools). Write two separate graders. The outcome grader reads only the final environment state. The trajectory grader reads the replayed tool calls and checks allowed tools, valid arguments, verification before mutation, duplicate side effects, and the step budget. The replay executor derives observations and final state itself; it never scores the final response text. Add one failing scenario that is relevant to your own application. Define **pass@1** here as the fraction of distinct tasks passing both graders with exactly one recorded run per task. It is a suite score, not an estimate of model performance. Repeated stochastic runs estimate variability, and any success among three is pass@3, not pass@1.

**Drill to implement:** Write Vitest or `node:test` tests with these assertions.
- Unsafe success: a run that activates without verification passes the outcome grader and fails the trajectory grader.
- Safe failure: a run whose verification finds an unready index and stops passes the trajectory grader and fails the outcome grader.
- Forgery: changing the claimed answer text or a claimed tool observation in the recorded run leaves both grades unchanged.
- Rebuild: after a successful rebuild, activation without fresh verification is flagged.
- Denominator: a task list with a repeated task ID is rejected, and the reported sample count equals the number of distinct tasks.

**Task data contract to define:** names the allowed tools may take (for the toy: `inspect`, `build`, `verify`, `activate`, `delete`); arguments that must contain exactly one nonempty `index_id`; fault injection fields such as `build_failures` and `unready_indexes` that make failures deterministic; reads that may repeat while repeated successful mutations of the same action and index count as duplicate side effects; and actions past the step budget that are reported as recorded but never executed.

**Acceptance check:** Your tests demonstrate both unsafe success and safe failure, prove that forging answer text or tool observations cannot change either grade, and show that a rebuild requires fresh verification. Keep the sample count visible in any report and do not report best-of-three as pass@1.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
