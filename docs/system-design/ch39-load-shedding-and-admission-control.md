# Chapter 39 — Load Shedding and Admission Control

*Practical_System_Design_Anup_Dangi.pdf, Chapter 39*

Why this exists. A healthy overloaded system rejects some work early so critical work can still succeed. Accepting everything can reduce successful throughput by causing queue growth, timeouts, and retries.

## Three concepts to retain

- Admission control protects capacity before work enters expensive stages. - Priority classes preserve high-value traffic during incidents. - Concurrency limits often protect scarce resources better than raw RPS limits.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths. example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Counterintuitive throughput Rejecting 500 of 1500 RPS can keep a 1000 RPS service healthy; accepting all 1500 may cause far fewer than 1000 successes after retry amplification.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If load shedding becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

Background exports consume every worker, causing interactive checkout to time out even though total fleet CPU appears moderate.

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

Write one sentence that must remain true during this failure. Examples: “A payment is never charged twice,” “committed file metadata never points to a nonexistent blob,” or “critical checkout traffic retains capacity even if analytics is shed.” deeper

## Small implementation / lab

Create critical and background request classes with separate concurrency budgets; overload both and verify critical p95 remains bounded.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Stripe rate limiters](https://stripe.com/blog/rate-limiters) - [Google SRE cascading failures](https://sre.google/sre-book/addressing-cascading-failures/)

## Recall checklist

- Why does load shedding exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
