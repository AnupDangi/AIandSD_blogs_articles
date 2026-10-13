# Chapter 39 — Production checklists and operational readiness

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 39*

## Learning outcomes

After this lesson, you should be able to define a release threshold before reviewing results; attach evidence, an owner, and a failure response to each readiness claim; and make a release, hold, or rollback decision that distinguishes local fixture evidence from production evidence.

**Prerequisite:** Chapters 22–38. This chapter brings their evaluation, observability, budgets, safety, and recovery controls together.

## Figure walkthrough

A launch review gathers evidence across product quality, runtime, security, operations, and economics. Each claim should point to an artifact or test, name the person accountable for a gap, and state what signal changes the release decision. The checklist organizes those decisions; it does not create evidence on its own.

**Authored instructional mechanism map — evidence to release decision.** This is a decision workflow; checking a box never supplies the missing production evidence.

| Gate | Evidence currently illustrated by the starter | Decision implication |
|---|---|---|
| Define contract first | Product-specific thresholds and critical slices | Freeze the gate before reviewing candidate results |
| Inspect fixture quality | Six cases; `5/6` citation coverage; retrieval slice `0.5` | Record the known miss; do not extrapolate to held-out customer accuracy |
| Inspect access boundary | No hosted identity/tenant fixture | Hold a multi-tenant launch until two-user evidence exists |
| Inspect recovery | Injected local retrieval timeout | Demonstrated locally; repeat against the deployed dependency |
| Inspect rollback | No deployment rehearsal in the starter | Name an owner/trigger and rehearse before rollout |
| Decide and monitor | Dated claim/evidence/status/owner table | Release, hold, or roll back according to the predeclared gates |

**Counterexample path:** candidate fixture coverage improves to `6/6`, but a two-user check exposes an unauthorized document → access gate fails → hold release despite the stronger aggregate. This hypothetical decision demonstrates why quality cannot override an authorization failure. Production readiness requires evidence from the complete deployed user journey, not only green local tests.

## Readiness is a system property

Review the user journey from request through authorization, model or retrieval work, tools, persistence, and response. At each boundary, ask what happens when the dependency is slow, incorrect, unavailable, or given hostile input. Then inspect the recovery behavior a learner or operator can observe. A green unit test for one function cannot establish that the whole journey is safe or useful.

Write the intended outcome and failure boundary before looking at candidate results. For example, a team might require at least 95 of 100 held-out answers to cite an allowed source, no unauthorized-source citations, and a visible degraded response during a provider outage. Those figures are an illustrative product contract, not universal thresholds. The team must justify thresholds using the feature's risk, test distribution, and user needs; it must also inspect critical slices because an aggregate can hide a failing document type or user group.

Operational claims need separate evidence: deadlines and budgets enforced, retries classified and bounded, interrupted work recoverable, high-impact side effects protected, traces correlated across components, and sensitive data excluded from logs. Finally, name who can stop rollout and which measurable signal triggers that action. “Rollback available” is only a claim until someone has rehearsed it.

### Turn claims into a release decision

Use a small evidence table, then write the decision in one sentence. An illustrative review might look like this:

| Claim | Evidence now | Status | Release consequence |
|---|---|---|---|
| Allowed-source citations in six fixtures | `python -m document_intelligence --evaluate` | Demonstrated locally, with one miss | Retain the miss as a retrieval gap. |
| Two users cannot cross-read documents | No identity or tenant fixture in the starter | Unverified | Hold a multi-tenant launch. |
| Retrieval outage has a visible failure result | Injected `TimeoutError` test | Demonstrated locally | Repeat against the deployed dependency. |
| Rollback can restore a working version | No deployment rehearsal | Unverified | Hold rollout until the operator rehearses it. |

The sample decision is **hold a multi-tenant production launch**. A team could still use the starter as a private teaching baseline. Set the gate before collecting results, name the owner and deadline for each gap, and attach a link to the actual evidence rather than an unchecked box. A release decision should also identify the rollback owner, a measurable trigger, and a tested action. For example, a canary could stop if the fraction of requests returning `unavailable` exceeds a justified threshold on sufficient traffic; that threshold is a product choice, not a number supplied by this chapter.

## Worked example: a known fixture failure is not launch evidence

The document-intelligence starter currently evaluates six deterministic fixture questions. Its output reports citation coverage `5/6` (about `0.8333`), a retrieval slice of `0.5`, and the other four slices at `1.0`. The known failure is a paraphrase query that the explicitly non-semantic toy retriever cannot bridge. These figures report whether each checked-in expected source appeared in the answer citations. They do not show that 100 held-out customer questions will meet a 95% threshold, that a hosted provider recovers from outage, or that production authorization is correct. A plausible release decision is therefore “fixture baseline recorded; retrieval gap and production readiness unresolved,” pending a justified retrieval change and separate outage, access-control, scale, and rollback evidence.

## Practice lab

From `projects/document-intelligence`, run the deterministic checks and capture their output:

```sh
python -m unittest discover -s tests -v
python -m document_intelligence --evaluate
```

The observable result should be a passing local test suite and a JSON evaluation summary with `cases: 6`, `citation_coverage: 0.8333333333333334`, `retrieval: 0.5`, and the `evaluation`, `reliability`, `safety`, and `workflow` slices each at `1.0`. Inspect `known_failures` and the failed case's `ranked_spans` rather than treating the aggregate as an all-green gate. Treat this as fixture evidence only.

Create a readiness record with columns for claim, evidence link or command, status (`demonstrated locally`, `proposed`, or `unverified`), owner, and release consequence. Add one injected failure from the existing tests, identify the returned status and citations, and state whether the evidence says anything about a deployed service. Do not mark authentication, telemetry, real traffic, or rollback as demonstrated by these local commands.

Add a counterexample to your record: imagine the next candidate improves citation coverage to `6/6` on these fixtures but makes an unauthorized document readable in a two-user test. Write which gate blocks launch and why the higher aggregate score cannot override it. Then specify what evidence would move that gate from unverified to demonstrated. This tests the decision rule, not merely the ability to collect metrics.

**Deliverable:** a dated readiness record, one successful and one failure trace, named owners for gaps, a release decision, and a rollback trigger.

## Failure review

- A checklist without evidence links and owners becomes ceremony.
- An overall score can conceal a severe slice regression or a broken critical journey.
- A fallback nobody exercised, an unnamed incident owner, or an untested rollback is not readiness.
- Provider-specific deployment advice changes; verify current guidance for the actual release target.

## Recall

- What production claim remains unverified when local fixture tests pass and a known retrieval miss is recorded?
- Which slice or safety failure would block launch despite a strong aggregate score?
- Who owns rollback, and what observed signal triggers it?

## Source

- [OpenAI production best practices](https://developers.openai.com/api/docs/guides/production-best-practices) — provider deployment guidance. The checklist remains application-level and should be adapted to the system's actual risks.
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/) — limiting release exposure and comparing canary behavior with a control.
- [Google SRE Workbook: Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/) — a concrete example of linking reliability evidence to release decisions.

## Try the simulation

Use the **`production-tabletop`** trace to compare **Launch when aggregate dashboard is green**, **Require named ownership and a practiced rollback**, and **Accept missing controls with a documented exception**. Predict the launch decision, then advance one evidence check at a time. The fixture has green metrics but no named responder, rollback drill, or valid risk owner/expiry, so its outcome should remain a hold. Hosted identity, telemetry, provider behavior, and rollback remain unverified; the local starter remains the source for project checks.

## Course project — milestone 8 — Production readiness

**Production review.** Run the suite and evaluation, then classify every launch claim as demonstrated locally, proposed, or unverified. Include the success criterion, critical slices, authorization boundary, dependency failure behavior, operational owner, and rollback trigger. The starter has no production deployment, auth, telemetry, external provider, or real traffic; record each as unverified unless you attach separate external evidence.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m unittest discover -s tests -v
python -m document_intelligence --evaluate
```

**Expected result:** tests pass and six fixture cases print, including a retrieval paraphrase miss; the readiness record keeps fixture evidence separate from proposed and unverified production capabilities.

**Acceptance check:** no external runtime capability is called verified without external evidence; include named gap owners, a release decision, and a measurable rollback trigger; retain the teaching-baseline label.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
