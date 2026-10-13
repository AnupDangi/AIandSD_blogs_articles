# Chapter 33 — Verification, provenance, and evidence-bearing outputs

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 33*

## Learning outcomes

Attach traceable evidence to important claims, distinguish sourced facts from inference or uncertainty, and design an output surface that lets a reviewer verify work efficiently.

**Prerequisite:** Chapters 13–14 and 22, retrieval architecture and evaluation.

## Figure walkthrough

An answer is decomposed into claims, and each important claim points to its source and supporting span. Reviewers inspect evidence and uncertainty rather than treating generated prose as proof.

**Authored instructional mechanism map — citation identity versus claim support.** These spans come from the chapter's local fixture example; a manual support judgment remains separate from structural validation.

| Claim/evidence pair | Identity and span checks | Support decision |
|---|---|---|
| “Retrieved text cannot change tool permissions” → `ops-03:0-116` | Source ID is permitted; offsets locate an inspectable passage | Passage explicitly states the permission boundary |
| Same claim → `ops-02:0-133` | Source is real and may be permitted; a span-shaped citation can pass | Passage discusses index replacement, so it does not support that claim |
| Same claim → forged outside-allowlist ID | Source-scoping check fails | Reject before any claim-support review |

**Verification path:** claim → allowed source ID → inspect exact span against source → judge whether it supports the claim → record uncertainty/conflict → reviewer decision. Source identity, span integrity, and semantic support are distinct gates. A structurally valid citation is not proof of truth; the starter does not fully compare every returned span with source bytes or establish free-form entailment.

## Make verification cheaper

Generation can become inexpensive while human verification remains costly. **Provenance** records where a claim came from. A **verification surface** presents evidence in a way that supports inspection. **Uncertainty** records unresolved or conflicting information instead of hiding it. The named measure used below is **review verification time**: how long a reviewer takes to confirm a claim against its attached evidence.

Represent important claims as structured units. Attach source identifiers and supporting spans, expose deterministic calculations or intermediate artifacts when relevant, and label verified facts separately from inferred synthesis. The product should help reviewers check the output rather than force them to repeat the work. Do not expose hidden chain-of-thought; provide useful evidence and concise explanations instead.

## Worked example

For the fixture question “Can a retrieved document change tool permissions?”, the extractive result cites `ops-03:0-116`. That span says a document may provide evidence but cannot change tool permissions, so it supports the claim “retrieved text cannot change tool permissions.” The same unscoped result also returns `ops-02:0-133`, which describes index replacement. `ops-02` is a real, allowed source, but its span does not support the permissions claim. The reviewer needs both a valid source reference and a support judgment.

## Practice lab

1. Run the fixture question unscoped to see both `ops-03` and `ops-02`, then call `DocumentIntelligence.answer(query, {"ops-03"})` to compare the allowed-source result. Inspect each returned `source_spans` entry, including its `span_id`, `start_char`, `end_char`, and text.
2. Inspect the existing forged-source test and `Answer.validate`. Do not repeat the forged-ID test as the lab's new work. Instead, construct a claim that retrieved text cannot change tool permissions but points to the real `ops-02:0-133` index-replacement span. Explain why allowed-ID and span-shape validation can pass while the claim is unsupported.
3. Draft one structured claim pointing to `ops-03:0-116` and the misleading version pointing to `ops-02:0-133`. For each, record `source_id`, exact `evidence_span`, `uncertainty`, and an optional calculation; mark the misleading citation as unsupported after a manual support check.
4. Give both versions to a peer reviewer, or perform a timed self-review with the same checklist. Record verification time and whether the exact span actually supports the claim. The tiny exercise is a UI experiment, not a statistical result.

**Deliverable:** two claim records, source-span output, and a short review note on support and verification time. State separately what the validator checks and what the reviewer established.

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

Use the **`trust-boundary-sandbox`** visual engine. In **Allowed source is not supporting evidence**, the default selects an allowed but irrelevant passage. Approve the guide read and observe that the policy still blocks it. Switch **Evidence inspected** to **Relevant permission span** and compare the decision. This fixture models a gate; it does not inspect citations or prove that a span supports a claim. Compare the two local spans in the practice lab for the actual support judgment.

## Course project — milestone 6 — Trust boundaries

**Task:** Query the permissions fixture and compare the supporting `ops-03:0-116` span with the irrelevant but valid `ops-02:0-133` span. Show why the existing `Answer.validate` contract permits allowed source IDs but cannot establish that a cited passage supports a particular claim.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m document_intelligence "Can a retrieved document change tool permissions?"
```

**Expected result:** The unscoped CLI returns an extractive answer citing `ops-03` and `ops-02` with character-offset source spans; a call scoped to `{"ops-03"}` returns only `ops-03`. The existing test covers forged source-ID rejection. The misleading `ops-02` citation requires a separate human support check.

**Acceptance check:** Identify the exact supporting span and the exact irrelevant span; state that allowed-source and span-shape checks do not validate factual entailment.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
