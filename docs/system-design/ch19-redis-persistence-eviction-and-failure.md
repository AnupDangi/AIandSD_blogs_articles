# Chapter 19 — Redis: Persistence, Eviction, and Failure

*Practical_System_Design_Anup_Dangi.pdf, Chapter 19*

Why this exists. Redis can be a cache, ephemeral store, coordination primitive, or durable-ish data system depending on configuration. The system design must state which role it plays.

## Three concepts to retain

- RDB snapshots and AOF have different durability/performance characteristics. - Eviction policies define behavior under memory pressure. - Using Redis as the only source of truth requires a very different recovery plan than using it as a cache.

## Senior engineer lens

Identify the invariant, the bottleneck, and the failure boundary before choosing technology. The same product can legitimately use different mechanisms for different data paths. example

## Mechanics

Start from the request or state transition, then identify which component owns each decision. Be explicit about synchronous boundaries: every synchronous hop extends the critical path and can propagate failure upstream. Be equally explicit about state: local memory, shared cache, replicated database, queue, and object store have different durability and consistency contracts. A robust design also defines identifiers and replay behavior. Request IDs, event IDs, shard keys, transaction IDs, trace IDs, and idempotency keys are not bookkeeping details; they are the handles that let the system detect duplicates, correlate work, route state, and recover safely. Failure contract If Redis is only a cache, losing it should hurt latency, not correctness.

## Trade-offs to reason through

- Latency vs coordination - Availability vs consistency - Throughput vs per-request isolation - Operational simplicity vs horizontal scale - Freshness vs caching - Cost vs headroom

## Design-review prompt

If Redis becomes the dominant bottleneck at 10x traffic, which metric would reveal it first, and what change would increase capacity without silently weakening correctness?

## Failure scenario

A “cache” accidentally becomes the only store for session-critical data; a restart turns into a correctness incident.

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

Configure Redis with no persistence, RDB, and AOF; restart the server and document what survives.

## What to measure

- correctness/invariant violations - throughput - p50/p95/p99 latency - error rate - saturation/queue depth - recovery time after injected failure

## Official and primary references

- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/) - [Redis eviction](https://redis.io/docs/latest/develop/reference/eviction/)

## Recall checklist

- Why does Redis exist? - What does the simplest correct architecture look like? - Which failure mode is most dangerous? - Which metric tells you it is saturating? - What would you build to prove you understand it?

---
*Source: `Practical_System_Design_Anup_Dangi.pdf`. [Suggest a correction](https://github.com/AnupDangi/learnlikeadev/issues/new)*
