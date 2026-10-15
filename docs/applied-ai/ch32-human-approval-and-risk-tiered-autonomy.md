# Chapter 32 — Human approval and risk-tiered autonomy

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 32*

## Learning outcomes

Classify tool actions by risk and reversibility, decide which require approval, and persist an approval interrupt so a run can safely resume with the exact action that was reviewed.

**Prerequisite:** Chapter 31, security and least-privilege containment.

## Figure walkthrough

Each proposed tool action is classified by risk and reversibility. Low-risk actions follow policy; high-risk actions pause with exact arguments until an authorized person approves or rejects them.

**Authored instructional mechanism map — approval bound to an action.** This proposed execution sequence expands the source description; the browser toy implements only part of it.

| Step | Persisted or checked information | Allowed transition |
|---|---|---|
| Propose | Actor, action, destination, payload identity, policy version | Classify impact and reversibility |
| Check policy | Scope and hard-denial rules | Denied export stays denied even if someone clicks approval |
| Pause when required | Pending workflow ID and exact proposed arguments | Await the authorized approver's recorded decision |
| Resume | Match current action/destination/payload and check expiry/policy again | Proceed only if the reviewed operation is still the current operation |
| Arguments change | Destination, action, or payload identity differs | Old approval no longer authorizes execution; deny or request a new review |
| Execute and record | Operation/result linked to the approved pending step | Persist enough state to avoid losing the decision after restart |

**Follow the toy branch:** approve a public-guide request → change its destination → approval no longer matches. Customer-record export remains a hard denial. Payload digests, expiry, and persisted approval records in this map are design requirements for a future subsystem, not features of the browser toy.

## Approval should match consequence

Human review is valuable for consequential actions, but requiring approval for everything creates fatigue and reduces utility. Classify each action by potential harm and reversibility. Low-risk, reversible actions may run automatically under a defined policy; high-risk or irreversible actions require explicit authorization.

An approval request should persist the exact proposed action and arguments, the relevant context, the approver, and the decision. If the agent changes the action after approval, the previous approval no longer applies. Persist the paused run state so approval can resume the same workflow rather than starting a new one with missing context.

## Worked example

Reading logs is low risk. Drafting an email is moderate risk. Sending it externally may require approval. Deleting production data or transferring funds requires stronger authorization. These examples are a starting point; the product’s own action policy should document its risk tiers.

## Practice lab

1. Classify four proposed operations—read a public guide, cite an allowed document, send an external email, and export customer records—by impact and reversibility.
2. In the trust-boundary visual, approve a public-guide request and then change its destination. Record the stale-approval result. Try customer-record export with approval and observe the hard denial.
3. Design an approval record for a future tool: actor, action, destination, payload digest, policy version, decision, expiry, and pending workflow ID. Explain which fields must be rechecked at execution.
4. Write a test specification (inputs, action, expected denial) for a changed payload under an old approval, using the toy values from the map above. Keep it as a design artifact until you implement an approval subsystem in your own project.

**Deliverable:** action-risk table, approval record schema, visual observations, and a proposed test case for changed arguments and resume. Mark the approval test as unimplemented.

## Failure review

- An approval dialog that hides the actual effect does not enable informed consent.
- Executing altered arguments under an old approval violates the approval contract.
- Approval state held only in live context disappears on restart.
- Frequent low-value prompts encourage users to approve without review.

## Recall

- Which actions can safely run without approval, and why?
- What exact data must an approval bind to?
- How does the workflow continue after a worker restart?

## Source

- [OpenAI guardrails and approvals guide](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)

## Try the simulation

Use the **`trust-boundary-sandbox`** visual engine. In **Approval belongs to one exact action**, approve the user-requested public-guide read, then change its destination or action. Observe the stale-approval status and that restricted scopes remain denied. The toy binds approval to action and destination; payload hashing is a proposed extension in the project task.

## Course project — milestone 6 — Trust boundaries

**Task:** In your own TypeScript project, add an approval check in front of one consequential action (for example a tool call that sends or writes something). Represent the approval as a small record that binds the exact action, destination, and a digest of the payload. Write a Vitest or `node:test` test that grants an approval, then changes the payload (or the destination) and asserts that execution is denied and a new review is requested. Write a second test that asserts the unchanged operation still proceeds. Label approval behavior proposed unless you implement and test it.

**Acceptance check:** Do not say approval is implemented unless your test passes against your code. State what must be revalidated at execution: action, destination, payload identity, expiry, and policy version.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
