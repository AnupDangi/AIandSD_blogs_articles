# Chapter 17 — ReAct, Planning, and Decomposition

*Plan only when uncertainty or dependencies justify it*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 17.*

## Learning outcomes

- Represent a tentative plan as bounded typed steps.
- Update a plan when observations invalidate assumptions.
- Avoid parallel execution when tasks share mutable state.

## Before you begin

Chapters 15–16; tool calls and simple control flow.

## Why this matters

Planning is valuable when tasks have dependencies, uncertainty, or parallel branches. It becomes overhead when the task is short and deterministic.

## Visual model

> **Source figure description retained:** Goal and constraints → tentative plan → action/observation loop → compare with expected progress → replan or stop.

**Authored instructional mechanism map — observation-driven replanning.** This follows the chapter's three-step offline planning exercise, not a model planner in the starter.

| State | Inspectable artifact | Transition |
|---|---|---|
| Goal/constraints | Objective, permissions, total maximum-step bound | Decide whether decomposition adds value |
| Tentative plan | Three bounded steps with prerequisites and expected observations | Choose an eligible next step |
| Execute/observe | Actual tool or fixture result plus completed-step identity | Update state before choosing more work |
| Observation invalidates a premise | Failed or contradictory evidence | Replan once in the local exercise; retain the original total step bound |
| Ready to stop | Goal satisfied, explicit failure, or no budget remains | Return result or a stated incomplete outcome |

**Dependency fork:** source-discovery branches with separate scopes may run concurrently; branches mutating the same state require coordination. Replanning does not reset the execution budget. The browser's exhausted-at-two-steps state illustrates a limit only; it does not generate a plan or revise one after an observation.

## Try the simulation

Open lesson `ai-17` and advance the **agent-state-machine** to **Inspect result**. Predict what a repeated observation should change, then select **Replay the prior observation**. Move the **Step budget** down to two and inspect the stop behavior. This fixed sequence cannot select actions or replan; implement the observation-triggered replan in the local practice lab.

## Concepts to retain

### ReAct loop

Interleave reasoning, action, and observation.

### Plan

A tentative decomposition, not an immutable script.

### Replan

Update the plan when observations invalidate assumptions.

## How it works

1. Identify the goal and constraints.
2. Decompose only where dependencies or uncertainty warrant it.
3. Execute one or more steps.
4. Compare observations with expected progress.
5. Replan or stop.

## Worked example

A research task can split source discovery into independent branches and merge findings. A two-field data extraction task should not spend an extra model call generating a plan first.

## Implementation sketch (pseudocode)

```python
state = {"goal": goal, "plan": initial_plan(goal), "completed": [], "observations": []}
outcome = build_result(state)
for _ in range(max_steps):
    step = choose_next_step(state)
    if step is None:
        break
    observation = execute(step)
    state = update_state(state, step, observation)
    if goal_satisfied(state) or explicit_failure(state):
        outcome = build_result(state)
        break
    if invalidates_plan(state):
        state["plan"] = replan(state, max_steps=max_steps)
else:
    outcome = build_result(state, incomplete=True)
```

This is pseudocode; `choose_next_step`, `execute`, `update_state`, and `replan` are application-defined. The state carries the current plan, and the loop returns a stated incomplete outcome when the step budget runs out before success or explicit failure. The local course starter does not implement a planner.

## What to measure

- Task success and completion time versus direct execution.
- Plan revisions and abandoned steps.
- Parallel work duplication and shared-state conflicts.

## Failure modes to reason about

- Planning every trivial request.
- Never revising a plan after evidence changes.
- Generating many vague subtasks.
- Parallelizing tasks that mutate the same state.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Represent a three-step plan as local dictionaries with typed-looking required fields.
- Execute steps against fixed observations and update state after each observation.
- Inject one failed observation; replan once, then stop at success, explicit failure, or the step budget.
- Compare the exercise with `CheckpointStore`; do not call a model planner.

## Course project — milestone 3: Workflow

**Task:** Use the checkpoint test to compare a fixed stage sequence with a ReAct-style plan. The starter implements replay-safe checkpoints, not planning or replanning.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "checkpoint_replays_completed_stage_without_repeating_effect" -v
```

**Expected observation:** The test passes and confirms a repeated stage ID returns the previously stored result rather than replacing it. It does not execute an external side effect or exercise a planner.

**Acceptance check:** Your state sketch updates state after each observation, has a maximum-step bound, and terminates on success, explicit failure, or budget exhaustion.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- When is planning worth its overhead?
- What evidence should trigger replanning?
- Why is shared mutation a parallelism hazard?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [ReAct paper](https://arxiv.org/abs/2210.03629)
- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
