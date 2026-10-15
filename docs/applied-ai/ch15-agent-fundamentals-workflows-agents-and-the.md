# Chapter 15 — Agent Fundamentals

*Workflows, agents, and the execution loop*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 15.*

## Learning outcomes

- Distinguish fixed workflow control flow from model-selected actions.
- Implement a bounded agent loop with observable steps.
- Compare an agent with a deterministic baseline.

## Before you begin

Chapters 1–14; TypeScript functions and API/tool calls.

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

```ts
let steps = 0;
while (steps < MAX_STEPS) {
  const action = await model.nextAction(state);
  const observation = await tools.execute(action);
  state = update(state, observation);
  steps += 1;
  if (done(state)) break;
}
```

This is an illustrative pseudocode sketch, not runnable code. Placeholder APIs or model operations are conceptual; the course project below can use small deterministic local data and no paid provider.

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

- Implement a small offline loop with two fixture-backed tools and a local `chooseAction(state)` policy. Make the policy choose its second tool only when the first observation is inconclusive, so the next action depends on what the tool returned.
- Record each action and observation, stop on success or explicit failure, and enforce `MAX_STEPS=6` for a case that never succeeds.
- Run the same cases through a fixed two-tool workflow and compare success, unnecessary calls, and budget exhaustion. The deterministic policy demonstrates control flow without pretending to reproduce an LLM agent.
- Store each completed step under a step ID, then replay the run and check that a completed step returns its saved result instead of repeating its effect; no provider is needed.

## Course project — milestone 3: Workflow

**Task:** In your own TypeScript project, put the application’s multi-step path behind an explicit bounded workflow runner. Give it a fixed list of named stages, a step budget, and a small checkpoint store keyed by stage ID (an in-memory `Map` is enough) so a completed stage is not run twice. Decide in a short note which part of your application is a fixed workflow and which part, if any, would need model-selected actions; keep the model-selected part out of the runner unless you can justify it. Write a Vitest or `node --test` test that runs the workflow, then runs it again with the same stage IDs and asserts that the effect function was called once (a call counter with `strictEqual`) and that the second run returns the saved result. Add a test that a run exceeding the step budget returns an explicit incomplete result instead of looping.

**Acceptance check:** You identify a case in your application suited to a fixed workflow, and your tests show replay without a repeated effect and an explicit incomplete result when the budget runs out. You do not claim your runner chooses tools or actions with a model unless it does, and a passing replay test does not show that an external write is atomic.

Use small deterministic local data and test doubles in your tests. No API key is required, and this check does not claim model-generated quality.

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
