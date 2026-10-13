# Chapter 4 — HTTP APIs: Contracts, Idempotency, and Pagination

*Practical_System_Design_Anup_Dangi.pdf, Chapter 4*

Why this exists. An API is a long-lived contract between independently deployed systems. Good API design therefore optimizes for compatibility, retries, observability, and predictable semantics rather than endpoint aesthetics.

## Three concepts to retain

- Methods and status codes communicate semantics. - Idempotency makes retries safe for operations with side effects. - Pagination, filtering, and versioning bound resource usage and change risk.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

## Worked example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Idempotency If a payment request times out after the charge succeeds, retrying without an idempotency key can charge twice.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If API design becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

Client retries POST /payments after a network timeout; the server executes the same business operation twice.

## Reason through the incident

1. What fails first?
2. What user-visible symptom appears?
3. Which retries or queues amplify the problem?
4. What stale or partial state can appear?
5. What telemetry proves the hypothesis?
6. What should degrade, reject, or fail over?
7. How do you recover without making the incident worse?
## Failure-path mental model

Do not stop at “component X is down.” Ask how callers behave while it is down. Timeouts occupy resources. Retries add traffic. Queues turn overload into stored waiting. Caches can convert failure into database load. Failover can expose stale replicas. A local defect becomes an outage through these feedback loops.

## Invariant check

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” read deeper

## Small implementation / lab

Implement POST /orders with an idempotency-key table and cursor-based pagination for GET /orders.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests) - [Stripe API versioning](https://stripe.com/blog/api-versioning)

## Recall checklist

- Why does API design exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
