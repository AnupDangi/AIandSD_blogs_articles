# Chapter 24 — Agent trajectory evaluation

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 24*

## Learning outcomes

Evaluate an agent’s end state separately from its final prose, define acceptable and unacceptable action sequences, and account for stochastic variation across repeated runs.

**Prerequisite:** Chapters 16–17 and 22, tool use, agent workflows, and evaluation suites.

## Figure walkthrough

Evaluate two outputs from a run separately: the environment’s final state and the recorded sequence of model decisions, tool calls, and observations. A correct final message alone does not establish either.

### Authored mechanism map — outcome and path are separate

This table maps the local, model-free index-release fixtures to the two graders. It is an authored teaching aid, not a recovered figure from the source PDF.

| Evidence flow | Grader question | Local evidence |
|---|---|---|
| Initial index state → recorded tool arguments → deterministic tool replay → actual final state | Is the target index active **and** ready? | `final_state.active_index` and `final_state.indexes[target_index]` |
| Replayed tool calls → derived observations → path rules | Were tools allowed, arguments valid, checks ordered, side effects unique, and steps bounded? | `trace`, `violations`, and `side_effect_counts` |
| Final answer text or a claimed tool observation | Does prose establish either result? | Neither is used for grading |

| Authored fixture | Outcome | Path | What separates them |
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

1. Run the 20 authored mock tasks in `fixtures/trajectories.json`. Each has an initial environment, target index, allowed tools, step budget, and exactly one recorded run.
2. Inspect each replayed tool call, arguments, derived observation, side-effect count, and final state. A fixture’s claimed success text or claimed observation must not change the score.
3. Compare `outcome_pass` with `trajectory_pass`. The outcome checks the active, ready index; the path checks inspection before mutation, successful verification before activation, final inspection, allowed tools and arguments, target boundaries, duplicate effects, and the step budget.
4. Modify `unsafe-no-verification` to verify before activation and observe its path result change. Then remove readiness in `valid-release` and stop after failed verification: the path can remain valid while the objective fails. Keep task IDs unique when adding scenarios.
5. For pass@1, run each task once and report the fraction of task runs that pass. Repeating a deterministic mock will produce the same result unless you explicitly inject variation. With a stochastic model, three independent runs per task can reveal variation; report their per-run rate separately from the fraction with at least one success (pass@3).

**Deliverable:** your changed trace fixtures, the two rubrics, and a report of outcome and trajectory errors, including the sample denominator.

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

Use the **`evaluation-console`** and select **Correct answer via forbidden source**. Predict the decision if only the final answer were graded, then compare it with the action-path result. The fixture should be rejected even though its final text passes. Also inspect **Safe abstention**: an acceptable path does not turn an unanswered task into a successful final outcome.

## Course project — milestone 4 — Evaluation

**Task:** Run the standalone deterministic trajectory evaluator, inspect the two rubrics, then add one failing scenario relevant to your document-intelligence release. The replay executor derives observations and final environment state; it never scores the final response text. **pass@1** here means the fraction of distinct fixture tasks passing both rubrics with exactly one recorded run per task. It is a fixture-suite score, not an estimate of model performance. Repeated stochastic runs estimate variability, while any success among three is pass@3, not pass@1.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m document_intelligence.trajectory
python -m unittest discover -s tests -p 'test_trajectory.py' -v
```

**Expected result:** the JSON report records `sample_count: 20`, `runs_per_task: 1`, `outcome_passes: 13`, `trajectory_passes: 10`, `passes: 6`, and `pass_at_1: 0.3`. The deliberately failing fixtures explain why these counts differ. Each result contains the derived trace, final state, rule violations, recorded/executed steps, and side-effect counts. All trajectory behavior tests pass.

**Fixture contract:** `allowed_tools` contains names from `inspect`, `build`, `verify`, `activate`, and `delete`; arguments contain exactly one nonempty `index_id`. `build_failures` and `unready_indexes` inject deterministic faults. Every successful build invalidates earlier verification. Reads may repeat, but repeated successful mutations of the same action and index count as duplicate side effects. Actions after `max_steps` are reported as recorded but never executed. You can pass an alternative JSON task list with `--fixtures path/to/your-trajectories.json`; repeated task IDs are rejected to protect the pass@1 denominator.

**Acceptance check:** demonstrate both unsafe success and safe failure; prove that forging answer text or tool observations cannot change either grade, and that a rebuild requires fresh verification. Keep the sample count visible and do not report best-of-three as pass@1.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
