# Chapter 31 — Security, sandboxing, and agent containment

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 31*

## Learning outcomes

Apply least privilege to agent tools, describe the boundaries a sandbox must enforce, and test that malicious or unexpected content cannot reach sensitive files or credentials.

**Prerequisite:** Chapters 16 and 18, tool interfaces and context engineering.

## Figure walkthrough

The agent sits inside filesystem, process, and network boundaries with only task-scoped capabilities. Credentials and unrelated host resources remain outside the reachable boundary.

**Authored instructional mechanism map — capability containment.** This is a proposed sandbox policy. A unit test of the policy does not exercise operating-system isolation.

| Boundary | Task-scoped permission | Denied or separately controlled capability |
|---|---|---|
| Filesystem | Edit files under `/workspace/repository` | Read home credential stores such as `~/.ssh` or unrelated directories |
| Process/command | Run the explicitly required project test command | Execute arbitrary host commands |
| Network | Call an approved mock or narrowly scoped API proxy | Reach arbitrary outbound hosts |
| Identity/credentials | Use only the least-privilege task credential | Access master or production administrator credentials |
| Data egress | Validate destination **and** payload against policy | Send secret/customer content merely because the destination is allowed |

**Attack path:** hostile retrieved text → proposed credential read or external send → capability boundary checks → deny and record the attempt. The model's refusal may be helpful but is not the enforcement step. A scoped document ID check establishes one data boundary only; separate tests must prove denied paths, commands, hosts, and payloads are actually inaccessible in the chosen runtime.

## Bound capability, not just behavior

A capable agent can make a wrong decision or encounter malicious content. A model’s willingness to refuse is not a security boundary. Give the agent a principal with fewer permissions than the user or administrator, expose only the required tools, and restrict its filesystem, process, and network access. Keep master credentials outside the sandbox; use a scoped credential tied to the task when access is needed.

The source’s example is a coding agent that can read and write one repository and create a branch, while it cannot access `~/.ssh`, production credentials, or arbitrary outbound hosts. The point is not a particular container implementation; it is to limit blast radius if the agent or its input is compromised.

## Worked example

Allow the agent to edit files under `/workspace/repository` and run the project test command. Deny reads from home-directory credential stores and deny arbitrary outbound network access. If a task needs one external API, route it through a mock or narrowly scoped proxy and test that the agent cannot reach a different destination.

## Practice lab

1. Write a capability manifest for a future agent: permitted project paths and commands, denied credential paths, and allowed network destinations.
2. In a small TypeScript sketch (or on paper), list the document or source IDs a caller is authorized to read for one request. Write down where in your code those IDs would be enforced: before retrieval, at the response boundary, or both.
3. Take a toy document and make an adversarial copy of it in test memory with an appended request to send a sentinel secret. Add an in-memory mock egress sink and assert the proposed policy rejects that payload even when the mock destination is on an allowlist. The original toy document itself contains no attack text.
4. Mark filesystem/process isolation and real network denial as unverified. A unit test with a mock sink has no agent process, container, tool egress, or credentials to exercise; those controls require a separate sandbox harness.

**Deliverable:** capability manifest, source-authorization notes, mock egress test, and a list of sandbox controls still requiring an isolated runtime.

## Failure review

- Inheriting a developer’s administrator token grants more authority than the task needs.
- A domain allowlist does not by itself prove that data sent to an allowed endpoint is safe.
- Approval prompts for every harmless operation can create fatigue; classify risk instead.
- Retrieved README or document text remains untrusted input, not policy.

## Recall

- What is the smallest capability this task requires?
- Which credentials remain outside the agent process?
- What test demonstrates that a denied path is genuinely inaccessible?

## Sources

- [Anthropic: How we contain Claude across products](https://www.anthropic.com/engineering/how-we-contain-claude)
- [OWASP LLM01: Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

## Try the simulation

Use the **`trust-boundary-sandbox`** visual engine. The **Containment under compromised context** case starts with retrieved instructions asking for a customer export to an external email. Try both evidence choices and approve the exact request. The hard policy still blocks the export. Switch to **Read public operations guide** and inspect the allowlisted scope. The fixture models a policy decision, not network isolation or payload inspection.

## Course project — milestone 6 — Trust boundaries

**Task:** In your own TypeScript project, add a **mock-only** egress policy: a small function that decides whether an outbound payload may go to a destination, plus an in-memory sink that records what it receives. Write a Vitest or `node:test` test that builds a test-only adversarial copy of one of your own source documents by appending an instruction to send a sentinel secret. Assert that the policy returns a denial and that the sink received no payload containing the sentinel, even when the sink's destination is on the allowlist. Write a second test that inspects your application's answer separately: allowed-source citations do not make quoted attack text safe or prove the output is free of sensitive data. Your project has no real network containment, so this is not proof of containment or of prompt-injection immunity.

**Acceptance check:** Your test fails if the sentinel secret reaches even an allowlisted endpoint without task-specific authorization. Label the sink a mock, and label the answer-output risk unverified if your answer can still quote the appended attack text.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
