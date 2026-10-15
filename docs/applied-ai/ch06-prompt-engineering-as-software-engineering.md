# Chapter 06 — Prompt Engineering as Software Engineering

*Prompts are versioned behavior, not magic incantations*

*Source chapter: `Practical_AI_Engineering_Anup_Dangi.pdf`, Chapter 06.*

## Learning outcomes

- Separate instructions from user and retrieved data.
- Build a small evaluation set with meaningful slices.
- Review prompt changes as versioned behavior changes.

## Before you begin

Chapters 1–5; an example classification or extraction task.

## Why this matters

Prompting is a relatively inexpensive behavior layer to change, but ad hoc tweaking becomes fragile without examples, evaluation, and version control.

## Visual model

> **Source figure description retained:** Prompt construction: policy and developer instructions are distinct from user intent and untrusted/retrieved content; examples and output contract guide behavior.

**Authored instructional mechanism map — prompt construction and regression decision.** This map preserves the distinction between instruction authority and task data.

| Input or gate | Role in the system | Review question |
|---|---|---|
| Policy and developer instructions | Define allowed behavior and output contract | Is the behavior versioned with the application? |
| User intent | Specifies the requested task within that policy | Is the request permitted? |
| Retrieved text and ticket contents | Supply untrusted evidence/data | Could an embedded instruction be mistaken for policy? |
| Few-shot examples | Illustrate classification/format boundaries | Are important slices represented without leaking evaluation answers? |
| Frozen evaluation set | Compares the incumbent and candidate | Did a critical slice regress even if the overall score rose? |

**Hypothetical release branch:** overall accuracy `87% → 93%` looks favorable, but refund-request accuracy `96% → 80%` requires investigation before release. These are the chapter's illustrative percentages, not outcomes from the separate 40-row lab. Keep input groups distinct when assembling a prompt; delimiters help readability but do not enforce authorization.

## Try the simulation

Open lesson `ai-06` and use the request workbench to compare **Prompt A · baseline** and **Prompt B · candidate** on the same five labeled cases. Predict whether the candidate's overall pass rate tells the whole story. Compare the per-slice rates, especially the untrusted-document-text slice, then inspect individual case observations. The fixtures are synthetic and do not run either prompt against a model.

## Concepts to retain

### Instruction hierarchy

Separate system policy, developer logic, user intent, and retrieved data.

### Few-shot examples

Demonstrations can specify format and decision boundaries.

### Prompt regression

A wording change can improve one slice while harming another.

## How it works

1. State the objective and constraints clearly.
2. Provide examples for ambiguous decisions.
3. Keep untrusted data separate from instructions.
4. Version prompts with the application.
5. Use evals to decide whether a change is ready.

## Worked example

**Hypothetical evaluation example:** A classification prompt improves from 87% to 93% overall after examples are added, while the refund-request slice drops from 96% to 80%. The aggregate score hides a regression; inspect slices and understand the failure before shipping. These numbers are illustrative, not reported study results.

## Implementation sketch (pseudocode)

```ts
const promptVersion = "ticket-classifier-v3";
const result = await classify({ prompt, examples, ticket });
recordEval(promptVersion, ticket.slice, result.label);
```

This is an illustrative pseudocode sketch, not a runnable command. Placeholder APIs or model operations are conceptual; the project path below can use predetermined predictions in place of a model.

## What to measure

- Overall and per-slice task accuracy.
- Invalid-output rate.
- Behavior changes between prompt versions.

## Failure modes to reason about

- Endless prompt tweaking without an eval set.
- Putting untrusted retrieved text in the instruction layer.
- Using hidden reasoning exposure — surfacing the model's internal chain of thought to users or downstream code — as a debugging strategy.
- Encoding business rules only in natural language when code can enforce them.

## Practice lab

**Goal:** Produce a small artifact that demonstrates the chapter’s core idea using local fixtures or toy values. No paid provider is required.

- Create 40 fixed input/label rows and divide them into two meaningful slices.
- Enter two columns of predetermined predictions as local fixture data; do not call a model.
- Calculate overall and per-slice accuracy with plain TypeScript (`reduce` and a `Map` keyed by slice) and inspect a case where the aggregate hides a regression.
- Record prompt versions as labels for the fixture comparison, not as evidence of live model behavior.

## Course project — milestone 1: Model boundary

**Task:** In your own TypeScript project, move prompt construction into one function that returns the prompt text, and export a version string such as `answer-prompt-v1`. Keep policy instructions, the user question, and retrieved passages in separate, labeled parts, with retrieved passages marked as data. Write a Vitest or `node --test` test that passes a passage containing an instruction-like sentence and asserts it appears only inside the data part and never in the instruction part. Then add a small labeled evaluation set (a handful of cases, each with a `slice` tag) and a function that computes overall and per-slice pass rates from predetermined predictions. Write a test with two prediction sets where the overall rate rises but one slice falls, and assert that your report exposes the falling slice.

**Acceptance check:** Your notes label the scores as results on your small local case set, not general model quality or production performance. Do not call this a prompt regression test unless the predictions come from running each prompt version against a model; with predetermined predictions it only checks your reporting logic. Delimiters help readability but do not enforce authorization.

### Recall without notes

- Why can a higher aggregate score still be a release blocker?
- Name a rule that should be enforced in code.
- Explain how to keep retrieved text separate from instructions.

### Completion check

Explain the trade-off in your own words, show the lab artifact, and identify one failure case your experiment exposed.

## Further reading

- [Lilian Weng — Prompt Engineering](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/)
- [Anthropic — Prompt engineering overview](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview)

---
*Original source: `Practical_AI_Engineering_Anup_Dangi.pdf`. References above are retained from its chapter source list; verify version-sensitive documentation before implementation. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
