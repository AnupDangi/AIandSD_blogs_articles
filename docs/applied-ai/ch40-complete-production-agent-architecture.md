# Chapter 40 — Complete production agent architecture

*Practical_AI_Engineering_Anup_Dangi.pdf, Chapter 40 — document-intelligence production review capstone*

## Learning outcomes

After this capstone, you should be able to trace a document question through its trust, retrieval, workflow, and evidence boundaries; map each of the eight project milestones to a test or artifact; and defend a proposed production architecture while clearly separating implemented behavior from design intent.

**Prerequisite:** Chapters 1–39. This capstone connects the model, retrieval, agent, safety, evaluation, and production topics from the course.

## Figure walkthrough

The request passes through four cooperating planes. **Ingress and control** authenticate the user, authorize the task, and select a permitted workflow. **Execution runtime** owns run state, checkpoints, deadlines, and side-effect policy. **Knowledge plane** retrieves only permitted documents and preserves source identity. **Operations plane** observes traces, evaluates behavior, tracks service objectives and cost, and governs release. The model can propose an answer or action inside this path; it does not own identity, permissions, durable truth, or release decisions.

**Authored instructional mechanism map — one request across four planes.** This is a proposed production contract; compare each row with the starter's actual evidence before marking it implemented.

| Plane/boundary | Data passed and state owner | Failure result/check |
|---|---|---|
| Ingress/control | Principal → allowed document set, request ID, deadline; policy owns access | Unauthorized task stops before retrieval or tools |
| Knowledge | Allowed IDs + query → ranked source passages with locations/version | Successful empty search → `not_found`; dependency failure → `unavailable` |
| Execution runtime | Request/run ID → bounded stages, artifact references, revisions/checkpoints | Reconcile interrupted side effects; reject stale state or unmatched approval |
| Answer boundary | Candidate + allowed spans → validated response | Reject outside-scope citations; independently inspect span integrity and support |
| Operations across planes | Correlated safe traces, fixed evaluations, resource ledger, release evidence | Critical regression stops rollout; retained compatible version enables rollback |

**Trace the local example:** permissions question → allowed fixture documents → extractive passages `ops-03` and `ops-02` → source IDs/offsets in the answer → reviewer notices that `ops-02` discusses index replacement rather than the permission claim. That request demonstrates inspectable evidence and a need for support review, not authenticated multi-tenant safety. The model or fixture adapter can propose output; identity, permissions, durable truth, and release remain application responsibilities.

## The model is one component

Begin a design defense by tracing one request, not by listing technologies. Name the actor that owns each state: identity belongs to the authentication boundary, the allowed document set to authorization policy, workflow progress to durable run storage, retrieved passages to the knowledge plane, and release evidence to evaluation and operations. Then show the checks between them. A retrieved document may support an answer but must not grant a tool permission; a model-produced citation must be checked against the request's allowed sources before it is returned.

This separation makes failure handling inspectable. If retrieval fails, the application can return unavailable rather than inventing evidence. If a worker restarts, the workflow can read a checkpoint. If an index is replaced, a versioned alias can be validated before activation. These are design responsibilities; drawing them does not prove the starter implements authentication, a durable queue, approvals, distributed traces, tenant storage, or production deployment.

Here is a compact service contract to defend. The ingress layer resolves a principal and document permissions; a server operation creates a request ID and a deadline. Retrieval receives only permitted document IDs and returns passages with document IDs and source offsets. Answer construction either cites permitted spans, returns `not_found` after a successful empty search, or returns `unavailable` after an operational failure. A durable workflow records stage IDs, artifact references, and revisions, and checks approval before a consequential tool action. Traces propagate the request ID across these steps while excluding prompt secrets, document bodies, and credentials. Each arrow needs an owner and an observable failure result. The local starter implements only selected parts of this contract.

## Worked example: one question, two evidence boundaries

Ask the local starter: “Can a retrieved document change tool permissions?” Its deterministic extractive answer cites `ops-03` and `ops-02`, and includes text saying that document content cannot change permissions. Its evidence array gives exact character offsets for the cited fixture spans. The fixture evaluation reports six cases with citation coverage `5/6`; a paraphrase query is a known retrieval miss. This demonstrates a local source-scoping contract and exposes a baseline failure. It is not a security test of an authenticated multi-tenant service: the CLI has no user identity or tenant boundary, and six curated cases cannot establish general accuracy.

For the proposed service, authorization should filter the document set before retrieval, and answer validation should reject citations outside that set. The model's text is not an authorization decision. A production defense would need separate tests for identity, tenant-scoped retrieval, hostile instructions inside a document, trace redaction, and failure recovery.

In the local code, `authorized_documents` narrows fixture documents and `Answer.validate` checks citation and span structure. It does not compare returned span text with the source document or prove that free-form prose is entailed by a span. A design defense must therefore separate **source identity validation**, **span integrity**, and **claim grounding**. For a future generative path, propose a held-out evaluation with intentionally irrelevant and conflicting passages, plus a manual review of consequential answers. Name the remaining risk even if every fixture test passes.

## Practice lab

From `projects/document-intelligence`, run the tests, evaluation, and one fixture-backed question:

```sh
python -m unittest discover -s tests -v
python -m document_intelligence --evaluate
python -m document_intelligence "Can a retrieved document change tool permissions?"
```

Expected observations: the test suite passes; evaluation prints six cases and citation coverage `0.8333333333333334`, with `retrieval: 0.5` and one known failure; the answer is extractive and includes citations `ops-03` and `ops-02` with source spans. Output includes a generated request ID, so it changes across runs. The starter uses deterministic fixtures and the standard library; it does not call a language model or enforce a real user's permissions.

Draw the request and state flows for the proposed deployed system. For every arrow, label the data passed, the policy check, the failure result, and the owner of durable state. Mark each box **implemented locally**, **proposed**, or **unverified** based on code or attached evidence. Include one successful trace and one failure path; do not infer hosted guarantees from the diagram.

Use this eight-row evidence map as the capstone's spine. Replace the examples with your actual artifact paths or test output; a design sketch does not count as implementation evidence.

| Milestone | Evidence to attach | Important remaining question |
|---|---|---|
| 1. Typed model boundary | Request/answer model tests | Has a live adapter been validated? |
| 2. Retrieval and citations | Ranking comparison and source-span output | Are spans faithful to the original source? |
| 3. Resumable workflow | Checkpoint replay test | What happens after a crash between side effect and checkpoint? |
| 4. Evaluation | Six-case JSON and failure slice | Does a representative held-out set meet the gate? |
| 5. Bounded reliability | Retry and unavailable tests | Does the deployed call obey an in-flight deadline? |
| 6. Trust and evidence | Allowed-source and forged-citation tests | Can a real user cross a tenant or tool boundary? |
| 7. Cache and recovery | Cache counters and guarded-store extension | Do quality and cost improve under realistic traffic? |
| 8. Readiness | Dated release record and rollback rehearsal | Who can halt rollout, and on what measured signal? |

For the five-minute defense, spend the first minute tracing one successful request, the second on an unavailable dependency, the third on a hostile document and side-effect boundary, the fourth on the eight evidence rows, and the fifth on the hold or release decision. State which answer would change if the retrieval index were stale or a worker restarted. A reviewer should be able to challenge a specific boundary rather than accept an impressive but untestable diagram.

**Deliverable:** an eight-milestone evidence map, request/data-flow diagram, successful and failed fixture traces, baseline evaluation output, a one-page runbook, and a five-minute design defense.

## Architecture review

- What is the source of truth, and which indexes or summaries can be rebuilt?
- Where is the authorization filter applied, and how are citations checked against it?
- Which operation is unsafe to retry without an idempotency key or reconciliation step?
- What data must not cross tenant boundaries or enter traces?
- What degraded response is visible when retrieval or a worker is unavailable?
- What measured signal and threshold would trigger rollback?

## Failure review

- One process owning all state makes replacement and recovery difficult.
- Confusing user permissions with agent permissions can over-authorize tools.
- Retrieval that bypasses authorization can expose restricted documents.
- Observability added only after incidents leaves early failures unexplained.
- An architecture diagram without failure tests describes intent, not demonstrated behavior.

## Recall

- Trace one question and name the owner of every important state transition.
- Which decisions remain deterministic instead of being delegated to model judgment?
- Which metric could look healthy while users cannot complete the end-to-end journey?
- What smallest failure injection would challenge your proposed design?

## Sources

- [OpenAI Agents SDK guide](https://developers.openai.com/api/docs/guides/agents/sdk)
- [Anthropic: Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
- [OpenTelemetry traces](https://opentelemetry.io/docs/concepts/signals/traces/)
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/) — correlating work across services without putting sensitive data into trace baggage.
- [Google SRE Workbook: Canarying Releases](https://sre.google/workbook/canarying-releases/) — measured rollout and rollback decisions.

## Try the simulation

Use the **`production-tabletop`** trace to compare **Keep state only in an in-memory agent loop**, **Persist bounded state and idempotent step results**, and **Use one stateless provider request per user turn**. Predict what survives a worker crash immediately after retrieval, then advance each path one transition at a time. Compare the durable checkpoint, evidence reference, and idempotency key in the resumable path with the two designs that must restart. These are authored architecture cases, not injected runtime failures. Compare them with the local starter's transient retrieval fallback test; it uses fixture retrieval and does not implement a production queue, hosted provider, or distributed trace.

## Course project — milestone 8 — Production readiness

**Production review and design defense.** Review all eight cumulative milestones: (1) typed model boundary, (2) retrieval and citations, (3) resumable workflow, (4) fixture evaluation, (5) bounded reliability, (6) trust and evidence boundaries, (7) bounded observable cache, and (8) readiness review. The starter is local, deterministic, standard-library-only, and not production deployed. For each milestone, cite a test, output, or artifact; label unimplemented deployment capabilities as proposed or unverified.

**Run locally** from the repository root:

```sh
cd projects/document-intelligence
python -m unittest discover -s tests -v
python -m document_intelligence --evaluate
python -m document_intelligence "Can a retrieved document change tool permissions?"
```

**Expected result:** tests pass; evaluation shows six fixture cases and the known retrieval miss; the sample answer includes only its fixture citations and source spans. Preserve the boundary between a fixture demonstration and a production claim.

**Acceptance check:** submit a design defense that maps evidence to all eight milestones, identifies authorization and state ownership, includes one success and one failure path, states measurable rollback criteria, and lists production gaps. Do not present the starter as a deployed or independently verified service.

---
*Source: `Practical_AI_Engineering_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
