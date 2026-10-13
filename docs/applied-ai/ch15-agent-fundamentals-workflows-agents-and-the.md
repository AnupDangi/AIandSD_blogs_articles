# Chapter 15 — Agent Fundamentals

*Workflows, agents, and the execution loop*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 15.*

## Learning outcomes

- Distinguish fixed workflow control flow from model-selected actions.
- Implement a bounded agent loop with observable steps.
- Compare an agent with a deterministic baseline.

## Before you begin

Chapters 1–14; Python functions and API/tool calls.

## Why this matters

An agent is useful when a system must decide what action to take next based on intermediate results. Many tasks are safer and simpler as deterministic workflows.

## Visual model

> **Source figure description retained:** Agent loop: objective and state → choose action → execute tool → observe result → update state → continue or stop; step limit bounds execution.

**Authored instructional mechanism map — bounded incident investigation.** This is a proposed agent control flow, not behavior performed by the fixed browser sequence.

| State/transition | Decision or action | Stop/continuation rule |
|---|---|---|
| Objective + current evidence | Investigate an incident within permissions and a step budget | Check remaining budget before choosing more work |
| Choose next action | Select a permitted log query based on the previous observation | Validate tool name and arguments before execution |
| Execute tool | Run the scoped query | Record an operation ID and classify any error |
| Observe + update | Add the result to current investigation state | Count the executed step; preserve evidence references |
| Decide again | Is sufficient evidence available to answer? | Answer when complete; otherwise loop only while budget remains |
| Budget exhausted / disallowed action | Further work cannot safely proceed | Return an explicit incomplete/degraded result instead of silently looping |

**Contrast in the chapter's examples:** fixed refund eligibility checks can follow a deterministic workflow; incident investigation can need observation-dependent action choice. A sequence with several stages becomes an agent only if action choice is actually dynamic.

## Try the simulation

Open lesson `ai-15` and use the **Agent state machine**. Follow the observe → choose → act → stop-rule sequence. Predict how the step budget limits the run, then select **Replay the last observation** and explain why a repeated observation must not authorize another action. The fixed sequence illustrates a bounded loop; it is not an agent choosing actions.

## Concepts to retain

### Workflow

Predetermined control flow.

### Agent

Model dynamically selects actions and tools.

### Environment

The tools and available state expose the world in which the agent acts.

## How it works

1. Receive an objective and current state.
2. Choose a useful next action.
3. Call a tool or model.
4. Observe the result and update state.
5. Stop when success or a termination condition is reached.

## Worked example

Refund processing with fixed eligibility rules is a workflow. Investigating a complex production incident may justify an agent because the next query depends on what prior logs reveal.

## Implementation sketch (pseudocode)

```python
steps = 0
while steps < MAX_STEPS:
    action = model.next_action(state)
    observation = tools.execute(action)
    state = update(state, observation)
    steps += 1
    if done(state):
        break
```

This is an illustrative pseudocode sketch, not a runnable command from the course starter. Placeholder APIs or model operations are conceptual; the required project path below uses only deterministic local fixtures and the Python standard library.

## What to measure

- Task success against the same task set.
- Tool calls and model calls per completed task.
- Termination, budget-exhaustion, and invalid-action rates.

## Failure modes to reason about

- Calling every multi-step prompt an agent.
- Using agents for deterministic transformations.
- Omitting a termination condition.
- Hiding tool behavior behind opaque frameworks.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Implement a small offline loop with two fixture-backed tools and a local `choose_action(state)` policy. Make the policy choose its second tool only when the first observation is inconclusive, so the next action depends on what the tool returned.
- Record each action and observation, stop on success or explicit failure, and enforce `MAX_STEPS=6` for a fixture case that never succeeds.
- Run the same cases through a fixed two-tool workflow and compare success, unnecessary calls, and budget exhaustion. The deterministic policy demonstrates control flow without pretending to reproduce an LLM agent.
- Compare the loop’s state handling with the project’s checkpoint replay test; no provider is needed.

## Course project — milestone 3: Workflow

**Task:** Inspect the deterministic `CheckpointStore` and run its replay test. The project has a bounded checkpointed workflow utility, not an autonomous model agent.

**Run these commands from `projects/document-intelligence/` (Python 3.12):**

```bash
python -m unittest discover -s tests -p "test_course_project.py" -k "checkpoint_replays_completed_stage_without_repeating_effect" -v
```

**Expected observation:** The test passes; replaying `write-1` returns the saved result instead of replacing it with a second result.

**Acceptance check:** You identify a case suited to a fixed workflow and avoid claiming the starter chooses tools or actions with a model.

This check uses the checked-in deterministic fixtures; it does not require an API key or claim model-generated quality.

### Recall without notes

- What evidence makes a task agentic?
- Why does the loop need a termination rule?
- When is a workflow preferable?

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [OpenAI Agents SDK guide](https://developers.openai.com/api/docs/guides/agents/sdk)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
