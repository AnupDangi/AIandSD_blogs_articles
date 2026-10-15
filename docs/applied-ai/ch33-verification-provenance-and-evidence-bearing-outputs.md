# Chapter 33 — Verification, provenance, and evidence-bearing outputs

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 33*

## Learning outcomes

Attach traceable evidence to important claims, distinguish sourced facts from inference or uncertainty, and design an output surface that lets a reviewer verify work efficiently.

**Prerequisite:** Chapters 13–14 and 22, retrieval architecture and evaluation.

## Figure walkthrough

An answer is decomposed into claims, and each important claim points to its source and supporting span. Reviewers inspect evidence and uncertainty rather than treating generated prose as proof.

**Authored instructional mechanism map — citation identity versus claim support.** These spans come from the chapter's toy example; a manual support judgment remains separate from structural validation.

| Claim/evidence pair | Identity and span checks | Support decision |
|---|---|---|
| “Retrieved text cannot change tool permissions” → `ops-03:0-116` | Source ID is permitted; offsets locate an inspectable passage | Passage explicitly states the permission boundary |
| Same claim → `ops-02:0-133` | Source is real and may be permitted; a span-shaped citation can pass | Passage discusses index replacement, so it does not support that claim |
| Same claim → forged outside-allowlist ID | Source-scoping check fails | Reject before any claim-support review |

**Verification path:** claim → allowed source ID → inspect exact span against source → judge whether it supports the claim → record uncertainty/conflict → reviewer decision. Source identity, span integrity, and semantic support are distinct gates. A structurally valid citation is not proof of truth; checking that an ID is allowed and a span is well formed does not compare the span with the source text or establish free-form entailment.

## Make verification cheaper

Generation can become inexpensive while human verification remains costly. **Provenance** records where a claim came from. A **verification surface** presents evidence in a way that supports inspection. **Uncertainty** records unresolved or conflicting information instead of hiding it. The named measure used below is **review verification time**: how long a reviewer takes to confirm a claim against its attached evidence.

Represent important claims as structured units. Attach source identifiers and supporting spans, expose deterministic calculations or intermediate artifacts when relevant, and label verified facts separately from inferred synthesis. The product should help reviewers check the output rather than force them to repeat the work. Do not expose hidden chain-of-thought; provide useful evidence and concise explanations instead.

## Worked example

For the toy question “Can a retrieved document change tool permissions?”, an extractive result cites `ops-03:0-116`. That span says a document may provide evidence but cannot change tool permissions, so it supports the claim “retrieved text cannot change tool permissions.” The same unscoped result also returns `ops-02:0-133`, which describes index replacement. `ops-02` is a real, allowed source, but its span does not support the permissions claim. The reviewer needs both a valid source reference and a support judgment.

## Practice lab

1. Using the chapter's toy values, write down the two results an unscoped search returns for the question (`ops-03:0-116` and `ops-02:0-133`), then write down the single result a search scoped to the allowed set `{ops-03}` returns. For each, list a span ID, start offset, end offset, and the passage text.
2. Write down what an allowed-ID check and a span-shape check each verify. Then take the claim that retrieved text cannot change tool permissions and point it at the real `ops-02:0-133` index-replacement span. Explain why both checks can pass while the claim is unsupported. Do not repeat a forged-ID rejection as the lab's new work.
3. Draft one structured claim pointing to `ops-03:0-116` and the misleading version pointing to `ops-02:0-133`. For each, record `source_id`, exact `evidence_span`, `uncertainty`, and an optional calculation; mark the misleading citation as unsupported after a manual support check.
4. Give both versions to a peer reviewer, or perform a timed self-review with the same checklist. Record verification time and whether the exact span actually supports the claim. The tiny exercise is a UI experiment, not a statistical result.

**Deliverable:** two claim records, the span listing from step 1, and a short review note on support and verification time. State separately what the validator checks and what the reviewer established.

## Failure review

- A citation can point to a real source without supporting the claim.
- A confidence score without calibration can imply certainty that was never measured.
- Displaying every intermediate token overwhelms reviewers; expose the evidence needed for verification.
- Evidence links need access checks too; provenance must not bypass source permissions.

## Recall

- What must a citation identify besides a document?
- How do you represent a claim that is inferred or unresolved?
- What measure indicates that evidence reduced review effort?

## Source

- [W3C PROV Model Primer](https://www.w3.org/TR/prov-primer/) — a provenance vocabulary for entities, activities, and agents; the lesson's citation-support checks are a separate application concern.

## Try the simulation

Use the **`trust-boundary-sandbox`** visual engine. In **Allowed source is not supporting evidence**, the default selects an allowed but irrelevant passage. Approve the guide read and observe that the policy still blocks it. Switch **Evidence inspected** to **Relevant permission span** and compare the decision. This simulation models a gate; it does not inspect citations or prove that a span supports a claim. Compare the two toy spans in the practice lab for the actual support judgment.

## Course project — milestone 6 — Trust boundaries

**Task:** In your own TypeScript project, make your answer type carry structured claims: each claim holds a source ID, an exact span (start and end offsets), and an uncertainty note. Add a validator that checks the source ID is in the caller's allowed set and the span offsets fit inside that source text. Write a Vitest or `node:test` test with one claim whose span genuinely supports it and one claim that cites an allowed source but an irrelevant span. Assert that the validator accepts both (that is the honest limit of a structural check), then add a manual support-review note that marks the irrelevant one as unsupported. Add a separate test that asserts a source ID outside the allowed set is rejected.

**Acceptance check:** Identify the exact supporting span and the exact irrelevant span in your own data. State that allowed-source and span-shape checks do not validate factual entailment, and that the support judgment in your project was made by a human reviewer.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
