# Chapter 32 — Transactional Outbox and the Dual-Write Problem

*Practical_System_Design_Anup_Dangi.pdf, Chapter 32*

Why this exists. Writing business state and publishing an event are two separate systems. Without an atomic boundary, one can succeed while the other fails, producing missing or phantom events.

## Three concepts to retain

- A relay publishes outbox rows to the broker asynchronously. - Consumers still need idempotency because relay delivery may repeat.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths.

## Worked example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Dual-write failure DB COMMIT succeeds; Kafka publish times out permanently. The order exists but downstream systems never hear about it.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If transactional outbox becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

A service publishes “OrderCreated” first, then DB insert fails; downstream ships an order that does not exist.

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

Implement an orders + outbox table and a polling relay; kill the relay between publish and marking sent to observe duplicates.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Microservices.io transactional outbox](https://microservices.io/patterns/data/transactional-outbox.html)

## Recall checklist

- What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
