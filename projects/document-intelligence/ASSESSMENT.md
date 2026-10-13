# Document intelligence capstone assessment

This rubric is the learner-facing acceptance contract for the eight cumulative milestones. A milestone is complete when its evidence is reproducible from the repository and the learner can explain the trade-off. A passing test suite alone does not establish production readiness.

## Milestone evidence

| Milestone | Required evidence | Acceptance checks |
|---|---|---|
| 1. Model boundary | Typed request/result contract, token-budget calculation, deterministic adapter invocation, structured-output validation, inspectable source spans, and malformed-output tests | The fixture CLI runs without credentials; limits are enforced before adapter invocation; disallowed citations fail; learners distinguish schema/source checks from semantic claim verification |
| 2. Retrieval | Ingestion/chunking configuration, lexical and vector rankings, fused/reranked results, citations, and a retrieval evaluation report | A learner can inspect ranking changes; every cited answer points to a source span; the report includes at least one known failure and a metric slice |
| 3. Durable workflow | State diagram, checkpoint file, subprocess crash/restart transcript, and duplicate-effect comparison | A crash after the modeled effect but before checkpoint exposes the unsafe duplicate; input-bound idempotency reuses the persisted effect; missing artifacts and changed inputs are rejected; resource/step limits are specified and exercised |
| 4. Evaluation and observability | Versioned fixture set, failure taxonomy, separate environment-outcome/path grades, trace for one request, judge calibration note, and cost-per-success calculation | Unsafe success and safe failure are distinguished; forged prose cannot change scores; pass@1 denominator is explicit; metrics are reproducible; judge disagreement is visible; a change is compared against a baseline |
| 5. Reliability | Deadline/retry policy, injected timeout/provider failure, fallback output, and regression gate | Retries are bounded and limited to transient errors; fallback is explicit and carries no unsupported citations; programming errors remain visible |
| 6. Trust boundaries | Threat model, permission table, hostile-document fixture, approval rule, and evidence-validation test | Untrusted text cannot grant permissions or authorize tools; approval is required for the documented high-risk action; unsupported claims fail closed |
| 7. Efficiency and recovery | Cache configuration and hit/miss experiment, worker crash/restart transcript, stale-writer comparison, and usage/cost comparison | Cache keys include all answer-affecting inputs; expiry/invalidation are demonstrated; the SQLite revision guard preserves a newer record against a stale writer; modeled effects are not duplicated after restart; real billing and external effects remain separately unverified |
| 8. Production readiness | Deployment/readiness checklist, runbook, threat-model update, rollback rehearsal, and design defense | A fresh environment can follow the runbook; each critical dependency has an owner and failure action; rollback and data recovery limits are explicit |

Use only the supplied fixtures for required evidence. A live provider, cloud account, or paid service may be an optional extension and must be clearly separated from the required path. Do not submit real secrets, private documents, or personal data.

## Final review rubric (100 points)

| Dimension | Points | Full-credit evidence |
|---|---:|---|
| Correctness and evidence | 25 | Answers are grounded in inspectable source spans; malformed, missing, and conflicting evidence are handled explicitly |
| Retrieval and evaluation | 15 | Ranking choices are justified with measurable slices; at least one failure is diagnosed and followed by a controlled change |
| Workflow durability | 15 | Checkpoints, interruption recovery, idempotency, and bounded execution are demonstrated with reproducible tests |
| Reliability and operations | 15 | Deadlines, transient retry limits, degraded behavior, observability, and rollback are exercised rather than merely described |
| Security and permissions | 15 | Trust boundaries, least privilege, approval points, and hostile-input behavior are demonstrated with tests |
| Cost and performance reasoning | 10 | The learner reports latency/cost trade-offs and explains cache or batching effects without presenting estimates as measured facts |
| Communication and reproducibility | 5 | Setup, assumptions, evidence, limitations, and design decisions are documented clearly enough for another learner to reproduce |

Passing requires at least 80/100 and no critical safety failure. Critical failures include fabricating a citation, allowing document text to expand tool permissions, leaking a credential, or claiming an unverified submission is production-ready. A failed review returns dimension-level feedback and a specific rerun/revision request; it does not expose hidden assessment keys.

## Submission packet

For each milestone, record the repository URL, optional commit SHA, checklist evidence, and a short reflection describing one decision and one limitation. The platform records this as **submitted—self-reported**. It does not fetch or execute the repository and does not claim tests passed or mastery was independently verified.
